import os
from typing import Optional
from faster_whisper import WhisperModel  # type: ignore

whisper_model: Optional[WhisperModel] = None

def init_whisper():
    global whisper_model
    if whisper_model is None:
        print("[STT] Initializing faster-whisper 'base.en' model...")
        try:
            whisper_model = WhisperModel("base.en", device="cpu", compute_type="int8")
            print("[STT] Loaded with compute_type='int8'.")
        except Exception as e:
            print(f"[STT] Int8 load failed ({e}), falling back to float32...")
            try:
                whisper_model = WhisperModel("base.en", device="cpu", compute_type="float32")
                print("[STT] Loaded with compute_type='float32'.")
            except Exception as e2:
                print(f"[STT] Float32 load failed ({e2}), falling back to default...")
                whisper_model = WhisperModel("base.en", device="cpu")
        print("[STT] faster-whisper 'base.en' model ready.")

def transcribe_audio_file(file_path: str) -> str:
    if not file_path or not os.path.exists(file_path):
        raise ValueError(f"Audio file not found: {file_path}")

    if whisper_model is None:
        init_whisper()

    if whisper_model is None:
        raise RuntimeError("Whisper STT model failed to initialize.")

    try:
        segments, info = whisper_model.transcribe(
            file_path,
            beam_size=5,
            language="en",
            vad_filter=True
        )
        text_list = [segment.text.strip() for segment in segments if segment.text]
        return " ".join(text_list).strip()
    except Exception as e:
        print(f"[STT Warning] Transcription with vad_filter failed ({e}), retrying without VAD filter...")
        try:
            segments, info = whisper_model.transcribe(
                file_path,
                beam_size=5,
                language="en",
                vad_filter=False
            )
            text_list = [segment.text.strip() for segment in segments if segment.text]
            return " ".join(text_list).strip()
        except Exception as err_retry:
            print(f"[STT Error] Transcription failed: {err_retry}")
            raise RuntimeError(f"Speech transcription failed: {str(err_retry)}")
