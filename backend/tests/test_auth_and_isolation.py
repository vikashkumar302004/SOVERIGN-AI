import os
import sys
import unittest
import uuid

from fastapi import Response
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from starlette.requests import Request

BACKEND_DIR = os.path.dirname(os.path.dirname(__file__))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

import config  # noqa: E402
import main  # noqa: E402
from auth import create_access_token, get_current_user  # noqa: E402
from database import Base  # noqa: E402
from models import ChatSession, GeneratedDeliverable, User, UserRole  # noqa: E402


class AuthAndIsolationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        test_dir = os.path.join(BACKEND_DIR, "scratch")
        os.makedirs(test_dir, exist_ok=True)
        cls.database_path = os.path.join(test_dir, f"test-auth-{uuid.uuid4().hex}.db")
        cls.engine = create_engine(
            f"sqlite:///{cls.database_path}",
            connect_args={"check_same_thread": False},
        )
        cls.Session = sessionmaker(autocommit=False, autoflush=False, bind=cls.engine)
        Base.metadata.create_all(bind=cls.engine)

    @classmethod
    def tearDownClass(cls):
        cls.engine.dispose()
        if os.path.exists(cls.database_path):
            os.remove(cls.database_path)

    def setUp(self):
        self.db = self.Session()

    def tearDown(self):
        self.db.rollback()
        self.db.close()

    def create_user(self, username: str) -> User:
        user = User(
            username=username,
            email=f"{username}@example.test",
            hashed_password="not-used-in-this-test",
            role=UserRole.EMPLOYEE,
        )
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return user

    def test_auth_cookie_is_http_only_and_authenticates_request(self):
        user = self.create_user("cookie_user")
        token = create_access_token({"sub": user.username, "user_id": user.id})
        response = Response()
        main._set_auth_cookie(response, token)
        cookie_header = response.headers["set-cookie"]

        self.assertIn("HttpOnly", cookie_header)
        self.assertIn("SameSite=strict", cookie_header)

        request = Request(
            {
                "type": "http",
                "method": "GET",
                "path": "/api/v1/auth/me",
                "headers": [(b"cookie", f"{config.AUTH_COOKIE_NAME}={token}".encode())],
            }
        )
        authenticated = get_current_user(request=request, credentials=None, db=self.db)
        self.assertEqual(authenticated.id, user.id)

    def test_chat_session_query_enforces_owner(self):
        owner = self.create_user("session_owner")
        intruder = self.create_user("session_intruder")
        session = ChatSession(title="Private session", user_id=owner.id)
        self.db.add(session)
        self.db.commit()
        self.db.refresh(session)

        self.assertIsNotNone(main._owned_session_query(self.db, session.id, owner.id).first())
        self.assertIsNone(main._owned_session_query(self.db, session.id, intruder.id).first())

    def test_deliverable_query_enforces_owner_and_manager_access(self):
        owner = self.create_user("deliverable_owner")
        intruder = self.create_user("deliverable_intruder")
        manager = self.create_user("deliverable_manager")
        manager.role = UserRole.MANAGER
        deliverable = GeneratedDeliverable(
            filename="private-report.pdf",
            file_path=os.path.join(BACKEND_DIR, "deliverables", "private-report.pdf"),
            output_format="pdf",
            owner_id=owner.id,
        )
        self.db.add(deliverable)
        self.db.commit()

        self.assertIsNotNone(
            main._accessible_deliverable_query(self.db, deliverable.filename, owner).first()
        )
        self.assertIsNone(
            main._accessible_deliverable_query(self.db, deliverable.filename, intruder).first()
        )
        self.assertIsNotNone(
            main._accessible_deliverable_query(self.db, deliverable.filename, manager).first()
        )


if __name__ == "__main__":
    unittest.main()
