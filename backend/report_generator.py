import os
import uuid
from datetime import datetime
from typing import List, Dict, Any, Optional

# python-docx imports
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import parse_xml
from docx.oxml.ns import nsdecls

# python-pptx imports
from pptx import Presentation
from pptx.util import Inches as PptxInches, Pt as PptxPt
from pptx.dml.color import RGBColor as PptxRGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import PP_ALIGN

# reportlab imports
from reportlab.lib.pagesizes import letter
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    HRFlowable,
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.pdfgen import canvas

import config


# ==============================================================================
# 1. DOCX STYLING & GENERATION (python-docx)
# ==============================================================================

def set_cell_background(cell, fill_hex: str):
    """Applies a solid background color to a docx table cell using oxml."""
    tcPr = cell._tc.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{fill_hex}"/>')
    tcPr.append(shd)


def set_cell_margins(cell, top=140, bottom=140, left=200, right=200):
    """Sets cell padding (in dxa: 20 dxa = 1 pt)."""
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = parse_xml(
        f'<w:tcMar {nsdecls("w")}>'
        f'<w:top w:w="{top}" w:type="dxa"/>'
        f'<w:bottom w:w="{bottom}" w:type="dxa"/>'
        f'<w:left w:w="{left}" w:type="dxa"/>'
        f'<w:right w:w="{right}" w:type="dxa"/>'
        f'</w:tcMar>'
    )
    tcPr.append(tcMar)


def add_docx_verdict_box(doc, text: str):
    """Renders a PASS/FAIL/NEEDS REVIEW status box inside a styled single-cell table."""
    upper_text = text.upper()
    if any(k in upper_text for k in ["PASS", "APPROVED"]):
        bg_hex = "D1FAE5"  # Light Emerald
        border_hex = "059669"
        text_color = RGBColor(0x06, 0x5F, 0x46)
        label = "VERDICT: PASS / APPROVED"
    elif any(k in upper_text for k in ["FAIL", "ACTION REQUIRED"]):
        bg_hex = "FEE2E2"  # Light Rose
        border_hex = "DC2626"
        text_color = RGBColor(0x99, 0x1B, 0x1B)
        label = "VERDICT: FAIL / ACTION REQUIRED"
    else:
        bg_hex = "FEF3C7"  # Light Amber
        border_hex = "D97706"
        text_color = RGBColor(0x92, 0x40, 0x0E)
        label = "VERDICT: NEEDS REVIEW / ATTENTION"

    table = doc.add_table(rows=1, cols=1)
    table.alignment = docx.enum.table.WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False

    cell = table.cell(0, 0)
    cell.width = Inches(6.5)
    set_cell_background(cell, bg_hex)
    set_cell_margins(cell, top=160, bottom=160, left=240, right=240)

    p = cell.paragraphs[0]
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run_label = p.add_run(f"{label}\n")
    run_label.font.name = "Arial"
    run_label.font.size = Pt(12)
    run_label.font.bold = True
    run_label.font.color.rgb = text_color

    if text != label:
        run_desc = p.add_run(text)
        run_desc.font.name = "Arial"
        run_desc.font.size = Pt(10)
        run_desc.font.color.rgb = text_color

    doc.add_paragraph()  # Spacing after table


def generate_docx(content: Dict[str, Any], file_path: str):
    """
    Generates a professionally formatted .docx report with cover title,
    heading hierarchy, 1.15 line spacing, real List Bullet styling, header/footer,
    and colored verdict boxes.
    """
    doc = docx.Document()

    # Set 1-inch page margins
    for section in doc.sections:
        section.top_margin = Inches(1.0)
        section.bottom_margin = Inches(1.0)
        section.left_margin = Inches(1.0)
        section.right_margin = Inches(1.0)

        # Running Header & Footer
        section.different_first_page_header_footer = False

        header = section.header
        hp = header.paragraphs[0]
        hp.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        hrun = hp.add_run("SOVEREIGN AI • COMMAND CENTER REPORT")
        hrun.font.name = "Arial"
        hrun.font.size = Pt(8.5)
        hrun.font.bold = True
        hrun.font.color.rgb = RGBColor(0x64, 0x74, 0x8B)  # Slate 500

        footer = section.footer
        fp = footer.paragraphs[0]
        fp.alignment = WD_ALIGN_PARAGRAPH.LEFT
        ts_now = datetime.now().strftime("%Y-%m-%d %H:%M:%S IST")
        frun = fp.add_run(f"Generated: {ts_now} | Air-Gapped Sovereign AI Output")
        frun.font.name = "Arial"
        frun.font.size = Pt(8.5)
        frun.font.italic = True
        frun.font.color.rgb = RGBColor(0x94, 0xA3, 0xB8)  # Slate 400

    # Document Title Area
    title_text = content.get("title", "Generated Deliverable")
    title_p = doc.add_paragraph()
    title_p.paragraph_format.space_before = Pt(0)
    title_p.paragraph_format.space_after = Pt(4)

    t_run = title_p.add_run(title_text)
    t_run.font.name = "Arial"
    t_run.font.size = Pt(24)
    t_run.font.bold = True
    t_run.font.color.rgb = RGBColor(0x0F, 0x17, 0x2A)  # Dark Navy / Slate 900

    # Subtitle Area
    subtitle_text = content.get("subtitle", "")
    if subtitle_text:
        sub_p = doc.add_paragraph()
        sub_p.paragraph_format.space_before = Pt(0)
        sub_p.paragraph_format.space_after = Pt(12)
        s_run = sub_p.add_run(subtitle_text)
        s_run.font.name = "Arial"
        s_run.font.size = Pt(11)
        s_run.font.italic = True
        s_run.font.color.rgb = RGBColor(0x64, 0x74, 0x8B)  # Slate 500

    # Horizontal Divider Line (via thin border table)
    div_table = doc.add_table(rows=1, cols=1)
    div_table.autofit = False
    div_cell = div_table.cell(0, 0)
    div_cell.width = Inches(6.5)
    set_cell_background(div_cell, "0E7490")  # Cyan 700 divider line
    set_cell_margins(div_cell, top=10, bottom=10, left=0, right=0)
    div_cell.paragraphs[0].paragraph_format.space_before = Pt(0)
    div_cell.paragraphs[0].paragraph_format.space_after = Pt(0)

    doc.add_paragraph().paragraph_format.space_after = Pt(12)  # spacing

    # Sections Layout
    sections = content.get("sections", [])
    if not sections and "slides" in content:
        sections = [
            {
                "heading": slide.get("title", f"Slide {idx+1}"),
                "content": "",
                "bullet_points": slide.get("bullet_points", [])
            }
            for idx, slide in enumerate(content["slides"])
        ]

    for sec in sections:
        heading = sec.get("heading", "")
        sec_content = sec.get("content", "")
        bullets = sec.get("bullet_points", [])

        # Heading 1
        if heading:
            h_p = doc.add_paragraph()
            h_p.paragraph_format.space_before = Pt(14)
            h_p.paragraph_format.space_after = Pt(6)
            h_run = h_p.add_run(heading)
            h_run.font.name = "Arial"
            h_run.font.size = Pt(14)
            h_run.font.bold = True
            h_run.font.color.rgb = RGBColor(0x0E, 0x74, 0x90)  # Dark Blue / Cyan 700

        # Check if content contains PASS / FAIL / VERDICT recommendation
        if sec_content and any(k in sec_content.upper() for k in ["STATUS:", "VERDICT:", "RECOMMENDATION HIGHLIGHT:"]):
            add_docx_verdict_box(doc, sec_content)
        elif sec_content:
            p = doc.add_paragraph()
            p.paragraph_format.space_before = Pt(0)
            p.paragraph_format.space_after = Pt(6)
            p.paragraph_format.line_spacing = 1.15
            run = p.add_run(sec_content)
            run.font.name = "Arial"
            run.font.size = Pt(11)
            run.font.color.rgb = RGBColor(0x1E, 0x29, 0x3B)  # Slate 800

        # Bullet Points using real Word 'List Bullet' style
        if bullets:
            for bp in bullets:
                b_text = bp.lstrip("-*• ").strip()
                if not b_text:
                    continue

                if any(k in b_text.upper() for k in ["STATUS:", "VERDICT:", "RECOMMENDATION:"]):
                    add_docx_verdict_box(doc, b_text)
                else:
                    bp_para = doc.add_paragraph(style="List Bullet")
                    bp_para.paragraph_format.space_before = Pt(0)
                    bp_para.paragraph_format.space_after = Pt(3)
                    bp_para.paragraph_format.line_spacing = 1.15
                    brun = bp_para.add_run(b_text)
                    brun.font.name = "Arial"
                    brun.font.size = Pt(10.5)
                    brun.font.color.rgb = RGBColor(0x33, 0x41, 0x55)

    doc.save(file_path)


# ==============================================================================
# 2. PPTX STYLING & GENERATION (python-pptx)
# ==============================================================================

def set_pptx_slide_background(slide, color_rgb: PptxRGBColor):
    """Fills slide background with solid dark color."""
    background = slide.background
    fill = background.fill
    fill.solid()
    fill.fore_color.rgb = color_rgb


def generate_pptx(content: Dict[str, Any], file_path: str):
    """
    Generates a PowerPoint presentation using a dark navy theme (#0F172A),
    cyan accents (#06B6D4), subtle background decorative elements,
    dynamically centered content with larger fonts & accent number badges,
    and a refined header/footer layout.
    """
    prs = Presentation()
    prs.slide_width = PptxInches(13.333)  # 16:9 Widescreen ratio
    prs.slide_height = PptxInches(7.5)

    bg_navy = PptxRGBColor(15, 23, 42)          # #0F172A
    accent_cyan = PptxRGBColor(6, 182, 212)      # #06B6D4
    text_white = PptxRGBColor(241, 245, 249)     # #F1F5F9
    text_muted = PptxRGBColor(100, 116, 139)     # #64748B (Muted Slate 500)
    bg_subtle_accent = PptxRGBColor(14, 38, 58)  # Low-contrast dark cyan for background shape

    # Slide 1: Title Slide (Blank Layout 6 for full control)
    title_slide = prs.slides.add_slide(prs.slide_layouts[6])
    set_pptx_slide_background(title_slide, bg_navy)

    # Decorative background oval at top right
    bg_oval1 = title_slide.shapes.add_shape(MSO_SHAPE.OVAL, PptxInches(9.5), PptxInches(-1.5), PptxInches(5.5), PptxInches(5.5))
    bg_oval1.fill.solid()
    bg_oval1.fill.fore_color.rgb = bg_subtle_accent
    bg_oval1.line.fill.background()

    # Accent Vertical Header Bar
    accent_bar = title_slide.shapes.add_shape(
        MSO_SHAPE.RECTANGLE, PptxInches(1.0), PptxInches(1.8), PptxInches(0.15), PptxInches(3.8)
    )
    accent_bar.fill.solid()
    accent_bar.fill.fore_color.rgb = accent_cyan
    accent_bar.line.color.rgb = accent_cyan

    # Main Title Box
    title_box = title_slide.shapes.add_textbox(PptxInches(1.4), PptxInches(2.0), PptxInches(10.5), PptxInches(3.5))
    tf = title_box.text_frame
    tf.word_wrap = True

    title_p = tf.paragraphs[0]
    title_p.text = content.get("title", "Generated Presentation")
    title_p.font.name = "Arial"
    title_p.font.size = PptxPt(38)
    title_p.font.bold = True
    title_p.font.color.rgb = text_white

    subtitle_text = content.get("subtitle", "Sovereign AI Command Center Delivered Content")
    if subtitle_text:
        sub_p = tf.add_paragraph()
        sub_p.text = subtitle_text
        sub_p.font.name = "Arial"
        sub_p.font.size = PptxPt(18)
        sub_p.font.color.rgb = text_muted
        sub_p.space_before = PptxPt(16)

    # Content Slides
    slides = content.get("slides", [])
    if not slides and "sections" in content:
        slides = [
            {
                "title": sec.get("heading", f"Section {idx+1}"),
                "bullet_points": ([sec.get("content")] if sec.get("content") else []) + sec.get("bullet_points", [])
            }
            for idx, sec in enumerate(content["sections"])
        ]

    total_slides = len(slides) + 1

    for s_idx, s_data in enumerate(slides, start=2):
        c_slide = prs.slides.add_slide(prs.slide_layouts[6])
        set_pptx_slide_background(c_slide, bg_navy)

        # 3. Subtle background design element (low-contrast dark cyan oval in top-right corner)
        bg_shape = c_slide.shapes.add_shape(
            MSO_SHAPE.OVAL, PptxInches(10.2), PptxInches(-1.2), PptxInches(4.8), PptxInches(4.8)
        )
        bg_shape.fill.solid()
        bg_shape.fill.fore_color.rgb = bg_subtle_accent
        bg_shape.line.fill.background()

        slide_title = s_data.get("title", f"Slide {s_idx-1}")

        # Slide Heading Box
        h_box = c_slide.shapes.add_textbox(PptxInches(0.8), PptxInches(0.6), PptxInches(11.7), PptxInches(0.9))
        htf = h_box.text_frame
        htf.word_wrap = True
        hp = htf.paragraphs[0]
        hp.text = slide_title
        hp.font.name = "Arial"
        hp.font.size = PptxPt(24)
        hp.font.bold = True
        hp.font.color.rgb = accent_cyan

        # Thin Accent Line under Heading
        line = c_slide.shapes.add_shape(
            MSO_SHAPE.RECTANGLE, PptxInches(0.8), PptxInches(1.4), PptxInches(11.7), PptxInches(0.02)
        )
        line.fill.solid()
        line.fill.fore_color.rgb = accent_cyan
        line.line.color.rgb = accent_cyan

        bullets = [b.lstrip("-*• ").strip() for b in s_data.get("bullet_points", []) if b.strip()]
        sec_text = s_data.get("content", "")

        # Check for PASS/FAIL/Verdict inside slide
        has_verdict = any("STATUS:" in b.upper() or "VERDICT:" in b.upper() for b in bullets) or ("STATUS:" in sec_text.upper())

        if has_verdict:
            verdict_str = next((b for b in bullets if "STATUS:" in b.upper() or "VERDICT:" in b.upper()), sec_text)
            upper_v = verdict_str.upper()

            if any(k in upper_v for k in ["PASS", "APPROVED"]):
                badge_bg = PptxRGBColor(5, 150, 105)  # Emerald 600
                v_title = "VERDICT: PASS / APPROVED"
            elif any(k in upper_v for k in ["FAIL", "ACTION REQUIRED"]):
                badge_bg = PptxRGBColor(220, 38, 38)  # Rose 600
                v_title = "VERDICT: FAIL / ACTION REQUIRED"
            else:
                badge_bg = PptxRGBColor(217, 119, 6)   # Amber 600
                v_title = "VERDICT: NEEDS REVIEW"

            v_shape = c_slide.shapes.add_shape(
                MSO_SHAPE.ROUNDED_RECTANGLE, PptxInches(1.5), PptxInches(2.5), PptxInches(10.3), PptxInches(2.8)
            )
            v_shape.fill.solid()
            v_shape.fill.fore_color.rgb = badge_bg
            v_shape.line.color.rgb = badge_bg

            v_tf = v_shape.text_frame
            v_tf.word_wrap = True
            vp = v_tf.paragraphs[0]
            vp.alignment = PP_ALIGN.CENTER
            vp.text = v_title
            vp.font.name = "Arial"
            vp.font.size = PptxPt(30)
            vp.font.bold = True
            vp.font.color.rgb = text_white

            vp2 = v_tf.add_paragraph()
            vp2.alignment = PP_ALIGN.CENTER
            vp2.text = verdict_str
            vp2.font.name = "Arial"
            vp2.font.size = PptxPt(18)
            vp2.font.color.rgb = text_white
            vp2.space_before = PptxPt(14)

        else:
            # 1. Vertical space calculation: Center content vertically based on bullet count
            num_items = len(bullets) if bullets else (1 if sec_text else 1)

            # Determine font size, spacing, and top offset to vertically center the content block
            if num_items <= 3:
                badge_size = PptxPt(22)
                text_size = PptxPt(20)
                space_after = PptxPt(22)
                top_y = PptxInches(2.3)
            elif num_items == 4:
                badge_size = PptxPt(20)
                text_size = PptxPt(18)
                space_after = PptxPt(16)
                top_y = PptxInches(2.0)
            else:
                badge_size = PptxPt(18)
                text_size = PptxPt(16)
                space_after = PptxPt(12)
                top_y = PptxInches(1.7)

            c_box = c_slide.shapes.add_textbox(PptxInches(0.8), top_y, PptxInches(11.7), PptxInches(4.5))
            ctf = c_box.text_frame
            ctf.word_wrap = True

            if sec_text:
                cp = ctf.paragraphs[0]
                cp.text = sec_text
                cp.font.name = "Arial"
                cp.font.size = text_size
                cp.font.color.rgb = text_white
                cp.space_after = space_after

            # 2 & 5. Refined Bullet / Numbered Step Cards
            is_process_slide = any(kw in slide_title.upper() for kw in ["HOW", "STEP", "PROCESS", "WORKS", "ALGORITHM", "IMPLEMENT", "PROTOCOL"]) or (2 <= num_items <= 4)

            for b_idx, b_clean in enumerate(bullets):
                if sec_text or b_idx > 0:
                    bp_para = ctf.add_paragraph()
                else:
                    bp_para = ctf.paragraphs[0]

                bp_para.space_after = space_after

                if is_process_slide:
                    # 5. Numbered vertical step list with accent badges (01, 02, 03)
                    r_badge = bp_para.add_run()
                    r_badge.text = f"{b_idx+1:02d}   "
                    r_badge.font.name = "Arial"
                    r_badge.font.size = badge_size
                    r_badge.font.bold = True
                    r_badge.font.color.rgb = accent_cyan

                    r_text = bp_para.add_run()
                    r_text.text = b_clean
                    r_text.font.name = "Arial"
                    r_text.font.size = text_size
                    r_text.font.color.rgb = text_white
                else:
                    # 2. Accent-colored refined bullet badge
                    r_badge = bp_para.add_run()
                    r_badge.text = "▪   "
                    r_badge.font.name = "Arial"
                    r_badge.font.size = badge_size
                    r_badge.font.bold = True
                    r_badge.font.color.rgb = accent_cyan

                    r_text = bp_para.add_run()
                    r_text.text = b_clean
                    r_text.font.name = "Arial"
                    r_text.font.size = text_size
                    r_text.font.color.rgb = text_white

        # 4. Footer refinement: thin top border line + smaller 9.5pt muted gray text
        f_line = c_slide.shapes.add_shape(
            MSO_SHAPE.RECTANGLE, PptxInches(0.8), PptxInches(6.8), PptxInches(11.7), PptxInches(0.015)
        )
        f_line.fill.solid()
        f_line.fill.fore_color.rgb = PptxRGBColor(30, 41, 59)  # Slate 800 subtle line
        f_line.line.fill.background()

        # Left Footer Box
        fl_box = c_slide.shapes.add_textbox(PptxInches(0.8), PptxInches(6.88), PptxInches(6.0), PptxInches(0.35))
        fl_tf = fl_box.text_frame
        fl_p = fl_tf.paragraphs[0]
        fl_p.text = "SOVEREIGN AI COMMAND CENTER"
        fl_p.font.name = "Arial"
        fl_p.font.size = PptxPt(9.5)
        fl_p.font.color.rgb = text_muted

        # Right Footer Box
        fr_box = c_slide.shapes.add_textbox(PptxInches(6.5), PptxInches(6.88), PptxInches(6.0), PptxInches(0.35))
        fr_tf = fr_box.text_frame
        fr_p = fr_tf.paragraphs[0]
        fr_p.alignment = PP_ALIGN.RIGHT
        fr_p.text = f"Slide {s_idx} of {total_slides}"
        fr_p.font.name = "Arial"
        fr_p.font.size = PptxPt(9.5)
        fr_p.font.color.rgb = text_muted

    prs.save(file_path)


# ==============================================================================
# 3. PDF STYLING & GENERATION (reportlab)
# ==============================================================================

class NumberedCanvas(canvas.Canvas):
    """
    Two-pass ReportLab Canvas that computes total pages dynamically
    and draws running headers and footers.
    """
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        self.setFont("Helvetica-Bold", 8)
        self.setFillColor(colors.HexColor("#64748B"))

        # Header
        self.drawString(54, 750, "SOVEREIGN AI • COMMAND CENTER REPORT")
        self.setStrokeColor(colors.HexColor("#CBD5E1"))
        self.setLineWidth(0.5)
        self.line(54, 744, 558, 744)

        # Footer
        self.line(54, 50, 558, 50)
        self.setFont("Helvetica-Oblique", 8)
        self.setFillColor(colors.HexColor("#94A3B8"))
        ts_now = datetime.now().strftime("%Y-%m-%d %H:%M:%S IST")
        self.drawString(54, 38, f"Generated: {ts_now} | Air-Gapped Local AI Output")
        self.drawRightString(558, 38, f"Page {self._pageNumber} of {page_count}")
        self.restoreState()


def generate_pdf(content: Dict[str, Any], file_path: str):
    """
    Generates a high-quality PDF deliverable using ReportLab with custom ParagraphStyles,
    ListFlowables, table-styled verdict boxes, and running headers/footers.
    """
    doc = SimpleDocTemplate(
        file_path,
        pagesize=letter,
        leftMargin=54,
        rightMargin=54,
        topMargin=64,
        bottomMargin=64,
    )

    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        "DocTitle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=24,
        leading=28,
        textColor=colors.HexColor("#0F172A"),
        spaceAfter=4,
    )

    subtitle_style = ParagraphStyle(
        "DocSubtitle",
        parent=styles["Normal"],
        fontName="Helvetica-Oblique",
        fontSize=11,
        leading=14,
        textColor=colors.HexColor("#64748B"),
        spaceAfter=12,
    )

    h1_style = ParagraphStyle(
        "DocH1",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=14,
        leading=18,
        textColor=colors.HexColor("#0E7490"),
        spaceBefore=14,
        spaceAfter=6,
    )

    body_style = ParagraphStyle(
        "DocBody",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=10.5,
        leading=14,
        textColor=colors.HexColor("#1E293B"),
        spaceAfter=6,
    )

    bullet_style = ParagraphStyle(
        "DocBullet",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=10,
        leading=14,
        textColor=colors.HexColor("#334155"),
        leftIndent=15,
        spaceAfter=4,
    )

    verdict_text_style = ParagraphStyle(
        "VerdictText",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=11,
        leading=15,
        alignment=1,  # Center
    )

    story = []

    # Title & Subtitle
    title_text = content.get("title", "Generated Deliverable")
    story.append(Paragraph(title_text, title_style))

    subtitle_text = content.get("subtitle", "")
    if subtitle_text:
        story.append(Paragraph(subtitle_text, subtitle_style))

    # Divider Line
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#0E7490"), spaceAfter=12))

    sections = content.get("sections", [])
    if not sections and "slides" in content:
        sections = [
            {
                "heading": slide.get("title", f"Slide {idx+1}"),
                "content": "",
                "bullet_points": slide.get("bullet_points", [])
            }
            for idx, slide in enumerate(content["slides"])
        ]

    for sec in sections:
        heading = sec.get("heading", "")
        sec_content = sec.get("content", "")
        bullets = sec.get("bullet_points", [])

        if heading:
            story.append(Paragraph(heading, h1_style))

        # Check for PASS/FAIL/Verdict
        if sec_content and any(k in sec_content.upper() for k in ["STATUS:", "VERDICT:", "RECOMMENDATION HIGHLIGHT:"]):
            upper_c = sec_content.upper()
            if any(k in upper_c for k in ["PASS", "APPROVED"]):
                bg_c = colors.HexColor("#D1FAE5")
                b_c = colors.HexColor("#059669")
                t_c = colors.HexColor("#065F46")
                lbl = "VERDICT: PASS / APPROVED"
            elif any(k in upper_c for k in ["FAIL", "ACTION REQUIRED"]):
                bg_c = colors.HexColor("#FEE2E2")
                b_c = colors.HexColor("#DC2626")
                t_c = colors.HexColor("#991B1B")
                lbl = "VERDICT: FAIL / ACTION REQUIRED"
            else:
                bg_c = colors.HexColor("#FEF3C7")
                b_c = colors.HexColor("#D97706")
                t_c = colors.HexColor("#92400E")
                lbl = "VERDICT: NEEDS REVIEW"

            v_p_style = ParagraphStyle("VStyle", parent=verdict_text_style, textColor=t_c)
            v_para = Paragraph(f"<b>{lbl}</b><br/>{sec_content}", v_p_style)
            v_table = Table([[v_para]], colWidths=[504])
            v_table.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, -1), bg_c),
                ("BOX", (0, 0), (-1, -1), 1.5, b_c),
                ("PADDING", (0, 0), (-1, -1), 8),
                ("ALIGN", (0, 0), (-1, -1), "CENTER"),
            ]))
            story.append(v_table)
            story.append(Spacer(1, 8))

        elif sec_content:
            story.append(Paragraph(sec_content, body_style))

        if bullets:
            for bp in bullets:
                b_clean = bp.lstrip("-*• ").strip()
                if not b_clean:
                    continue

                if any(k in b_clean.upper() for k in ["STATUS:", "VERDICT:", "RECOMMENDATION:"]):
                    upper_b = b_clean.upper()
                    if any(k in upper_b for k in ["PASS", "APPROVED"]):
                        bg_c = colors.HexColor("#D1FAE5")
                        b_c = colors.HexColor("#059669")
                        t_c = colors.HexColor("#065F46")
                        lbl = "VERDICT: PASS / APPROVED"
                    elif any(k in upper_b for k in ["FAIL", "ACTION REQUIRED"]):
                        bg_c = colors.HexColor("#FEE2E2")
                        b_c = colors.HexColor("#DC2626")
                        t_c = colors.HexColor("#991B1B")
                        lbl = "VERDICT: FAIL / ACTION REQUIRED"
                    else:
                        bg_c = colors.HexColor("#FEF3C7")
                        b_c = colors.HexColor("#D97706")
                        t_c = colors.HexColor("#92400E")
                        lbl = "VERDICT: NEEDS REVIEW"

                    v_p_style = ParagraphStyle("VStyle", parent=verdict_text_style, textColor=t_c)
                    v_para = Paragraph(f"<b>{lbl}</b><br/>{b_clean}", v_p_style)
                    v_table = Table([[v_para]], colWidths=[504])
                    v_table.setStyle(TableStyle([
                        ("BACKGROUND", (0, 0), (-1, -1), bg_c),
                        ("BOX", (0, 0), (-1, -1), 1.5, b_c),
                        ("PADDING", (0, 0), (-1, -1), 8),
                        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                    ]))
                    story.append(v_table)
                    story.append(Spacer(1, 8))
                else:
                    story.append(Paragraph(f"&bull;&nbsp;&nbsp;{b_clean}", bullet_style))

        story.append(Spacer(1, 4))

    doc.build(story, canvasmaker=NumberedCanvas)


# ==============================================================================
# 4. SHARED DELIVERABLE FUNCTION
# ==============================================================================

def structured_content_to_file(
    content: Dict[str, Any],
    output_format: str,
    filename_prefix: str = "deliverable"
) -> Dict[str, str]:
    """
    Unified deliverable file generator supporting 'docx', 'pptx', and 'pdf'.
    Saves the output to config.DELIVERABLES_DIR and returns file info.
    """
    fmt = output_format.lower().strip()
    if fmt not in ["docx", "pptx", "pdf"]:
        raise ValueError(f"Unsupported output format: '{output_format}'. Must be docx, pptx, or pdf.")

    unique_id = uuid.uuid4().hex[:8]
    filename = f"{filename_prefix}_{unique_id}.{fmt}"
    file_path = os.path.join(config.DELIVERABLES_DIR, filename)
    os.makedirs(config.DELIVERABLES_DIR, exist_ok=True)

    if fmt == "docx":
        generate_docx(content, file_path)
    elif fmt == "pptx":
        generate_pptx(content, file_path)
    elif fmt == "pdf":
        generate_pdf(content, file_path)

    return {
        "deliverable_file_path": file_path,
        "filename": filename,
        "download_url": f"/api/v1/deliverables/{filename}"
    }


def generate_inspection_report_docx(
    workflow_id: str,
    document_id: int,
    document_filename: str,
    model_analysis: str,
    related_context: List[Dict[str, Any]],
    ai_recommendation: str = "NEEDS REVIEW",
    approval_status: str = "PENDING_REVIEW",
    reviewed_by_name: Optional[str] = None,
    reviewer_comment: Optional[str] = None,
    reviewed_at_str: Optional[str] = None,
) -> Dict[str, str]:
    """
    Inspection report generator with dual AI Recommendation + Human Manager Review Sign-Off.
    """
    if approval_status == "PENDING_REVIEW":
        status_banner = f"STATUS: AI RECOMMENDATION — PENDING MANAGER APPROVAL ({ai_recommendation})"
    elif approval_status == "APPROVED":
        status_banner = f"STATUS: PASS / APPROVED (Manager Review: APPROVED by {reviewed_by_name or 'Manager'})"
    else:
        status_banner = f"STATUS: FAIL / ACTION REQUIRED (Manager Review: REJECTED by {reviewed_by_name or 'Manager'})"

    sections = [
        {
            "heading": "1. Document & Review Governance Metadata",
            "content": (
                f"Target Document: {document_filename} (ID #{document_id})\n"
                f"Workflow Reference: {workflow_id}\n"
                f"Approval Status: {approval_status}\n"
                f"AI Verdict Recommendation: {ai_recommendation}\n"
                f"Generated At: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}"
            ),
            "bullet_points": []
        },
        {
            "heading": "2. Human Manager Sign-off & Review Status",
            "content": (
                f"APPROVAL STATUS: {approval_status}\n"
                f"AI Recommendation: {ai_recommendation}\n"
                + (
                    f"Reviewer: {reviewed_by_name}\nReviewed At: {reviewed_at_str}\nManager Comments: {reviewer_comment or 'No comment provided.'}"
                    if approval_status in ["APPROVED", "REJECTED"]
                    else "Notice: This report is an AI Recommendation pending explicit sign-off by a Manager or Admin."
                )
            ),
            "bullet_points": []
        },
        {
            "heading": "3. Executive Summary & Reasoning Analysis",
            "content": model_analysis,
            "bullet_points": []
        }
    ]

    bullets = [line.lstrip("-*• ").strip() for line in model_analysis.split("\n") if line.strip().startswith(("-", "*", "•"))]
    if bullets:
        sections.append({
            "heading": "4. Key Findings & Identified Measurements",
            "content": "",
            "bullet_points": bullets
        })

    if related_context:
        sop_bullets = [
            f"Ref #{idx+1}: {item.get('filename')} (Score: {item.get('similarity_score', 0.0):.2f}) - \"{item.get('chunk_text', '')[:100]}...\""
            for idx, item in enumerate(related_context)
        ]
        sections.append({
            "heading": "5. Related Standard Operating Procedure (SOP) Context",
            "content": "",
            "bullet_points": sop_bullets
        })

    sections.append({
        "heading": "6. Final Sign-off Banner",
        "content": status_banner,
        "bullet_points": []
    })

    content_dict = {
        "title": "INSPECTION & APPROVAL REPORT",
        "subtitle": f"Workflow ID: {workflow_id} | Document: {document_filename} | Status: {approval_status}",
        "sections": sections
    }

    res = structured_content_to_file(content_dict, "docx", filename_prefix=f"inspection_report_doc_{document_id}_{workflow_id[:8]}")
    return {
        "deliverable_file_path": res["deliverable_file_path"],
        "filename": res["filename"]
    }
