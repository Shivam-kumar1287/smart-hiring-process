import os
import sys
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfgen import canvas

# Define NumberedCanvas for professional Page X of Y footers and running headers
class NumberedCanvas(canvas.Canvas):
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
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#7f8c8d"))
        
        # Draw running footer on all pages
        page_text = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(612 - 54, 30, page_text)
        self.drawString(54, 30, "Exploratory Project (22CS-401) | Chitkara University")
        
        # Draw running header on page 2 and onwards
        if self._pageNumber > 1:
            self.drawString(54, 792 - 36, "PROJECT SYNOPSIS: SMART JOB TRACKER")
            self.drawRightString(612 - 54, 792 - 36, "DEPARTMENT OF COMPUTER SCIENCE")
            self.setStrokeColor(colors.HexColor("#bdc3c7"))
            self.setLineWidth(0.5)
            self.line(54, 792 - 40, 612 - 54, 792 - 40)
            
        self.restoreState()

def build_pdf(filename="EP_Form_Week1_Synopsis.pdf"):
    # Target page margins: 0.75 in (54 pt)
    doc = SimpleDocTemplate(
        filename,
        pagesize=letter,
        leftMargin=54,
        rightMargin=54,
        topMargin=54,
        bottomMargin=54
    )
    
    styles = getSampleStyleSheet()
    
    # Custom Palette
    c_primary = colors.HexColor("#1a2b4c")    # Deep Navy
    c_secondary = colors.HexColor("#3d5a80")  # Steel Blue
    c_accent = colors.HexColor("#e0e7ff")     # Light Indigo Accent
    c_body = colors.HexColor("#2b2d42")       # Dark Charcoal Text
    
    # Custom Paragraph Styles (Always define leading when modifying fontSize)
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=20,
        leading=24,
        textColor=c_primary,
        alignment=1, # Center
        spaceAfter=8
    )
    
    subtitle_style = ParagraphStyle(
        'DocSubTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=15,
        textColor=c_secondary,
        alignment=1, # Center
        spaceAfter=20
    )
    
    h1_style = ParagraphStyle(
        'SectionHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=13,
        leading=16,
        textColor=c_primary,
        spaceBefore=14,
        spaceAfter=6,
        keepWithNext=True
    )
    
    h2_style = ParagraphStyle(
        'SubSectionHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10,
        leading=13,
        textColor=c_secondary,
        spaceBefore=8,
        spaceAfter=4,
        keepWithNext=True
    )
    
    body_style = ParagraphStyle(
        'BodyTextCustom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=13.5,
        textColor=c_body,
        spaceAfter=6
    )
    
    bullet_style = ParagraphStyle(
        'BulletTextCustom',
        parent=body_style,
        leftIndent=15,
        firstLineIndent=-10,
        spaceAfter=4
    )
    
    meta_label_style = ParagraphStyle(
        'MetaLabel',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=11,
        textColor=c_primary
    )
    
    meta_val_style = ParagraphStyle(
        'MetaVal',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=11,
        textColor=c_body
    )
    
    story = []
    
    # Title & Header
    story.append(Paragraph("PROJECT SYNOPSIS: SMART JOB TRACKER", title_style))
    story.append(Paragraph("AI-Powered Recruitment Management & Online Assessment Platform", subtitle_style))
    
    # Metadata Table
    meta_data = [
        [Paragraph("Course Code:", meta_label_style), Paragraph("22CS-401 (Exploratory Project)", meta_val_style),
         Paragraph("Domain:", meta_label_style), Paragraph("Web & Mobile App / AI & ML", meta_val_style)],
        [Paragraph("Team Lead:", meta_label_style), Paragraph("Shivam Kumar (shivam1287.be23@chitkara.edu.in)", meta_val_style),
         Paragraph("Group:", meta_label_style), Paragraph("G15 / G16 / G17 (Select Group)", meta_val_style)],
        [Paragraph("Team Roll No:", meta_label_style), Paragraph("Lead Roll: [Your Roll No]<br/>M2: [Roll No], M3: [Roll No], M4: [Roll No]", meta_val_style),
         Paragraph("Timeline:", meta_label_style), Paragraph("July – December 2026", meta_val_style)]
    ]
    
    meta_table = Table(meta_data, colWidths=[80, 180, 50, 194])
    meta_table.setStyle(TableStyle([
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#f8fafc")),
        ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e1")),
        ('INNERGRID', (0,0), (-1,-1), 0.25, colors.HexColor("#e2e8f0")),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 15))
    
    # Section 1: Problem Statement
    story.append(Paragraph("1. Problem Statement", h1_style))
    story.append(Paragraph(
        "Modern corporate recruitment is heavily burdened by administrative overhead and process inefficiencies. A single job opening frequently receives hundreds or thousands of digital applications, yet hiring managers typically spend only 6 to 10 seconds reviewing a resume initially. This brief manual screening is highly prone to human error, cognitive bias, and accidental omission of highly qualified candidates. Furthermore, candidates suffer from a complete lack of transparency, receiving no feedback or updates regarding their application progression. Lastly, recruitment operations remain fragmented across disconnected tools like spreadsheet files, personal email inboxes, and external testing websites, leading to data scattering, operational disorganization, and high time-to-hire metrics.",
        body_style
    ))
    
    # Section 2: Objective & Key Learnings
    story.append(Paragraph("2. Objectives & Key Learnings", h1_style))
    story.append(Paragraph("<b>Objectives:</b>", h2_style))
    story.append(Paragraph("• <b>Automate Candidate Screening:</b> Implement NLP parsing and scoring of PDF resumes using Groq AI Cloud to immediately rate criteria alignment.", bullet_style))
    story.append(Paragraph("• <b>Centralize Recruitment Management:</b> Build dynamic HR and candidate pipelines to track applications from review to final selection.", bullet_style))
    story.append(Paragraph("• <b>Integrate Secure Assessment:</b> Create an online coding interface with automated compilation and tab-switch cheating prevention.", bullet_style))
    story.append(Paragraph("• <b>Seamless Video Calling:</b> Embed a direct peer-to-peer WebRTC video channel within the web interface to host remote interviews.", bullet_style))
    
    story.append(Paragraph("<b>Key Learnings:</b>", h2_style))
    story.append(Paragraph("• Mastering full-stack client-server development using the modern MERN stack (React 19, Tailwind CSS 4, Node.js/Express, MongoDB Atlas).", bullet_style))
    story.append(Paragraph("• Integrating AI services via external JSON APIs and formatting strict prompt responses for automated Applicant Tracking Systems.", bullet_style))
    story.append(Paragraph("• Implementing browser security controls (HTML5 Visibility API) and real-time P2P stream handshakes (WebRTC signaling via DB states).", bullet_style))
    
    story.append(Spacer(1, 8))
    
    # Section 3: Functional & Non-Functional Requirements
    story.append(Paragraph("3. Functional & Non-Functional Requirements", h1_style))
    story.append(Paragraph("<b>Functional Requirements:</b>", h2_style))
    story.append(Paragraph("• <b>Secure Auth:</b> Role-based access control (HR vs. Candidate) with JWT session tokens and OTP verification.", bullet_style))
    story.append(Paragraph("• <b>Job Management:</b> HR dashboard allowing creation, modification, and toggling of active job listings.", bullet_style))
    story.append(Paragraph("• <b>AI Analysis:</b> Automated parsing of uploaded resume PDFs, returning an ATS score (0-100), key skills, and missing skill suggestions.", bullet_style))
    story.append(Paragraph("• <b>Test Assessment:</b> A Monaco-editor coding compiler executing user algorithms against backend tests, tracking cheating warnings.", bullet_style))
    story.append(Paragraph("• <b>Meeting Room:</b> Integrated WebRTC video room allowing live client calls and concurrent text chat.", bullet_style))
    story.append(Paragraph("• <b>Doc Generation:</b> Automatically creates dynamic, professional job offer letters in PDF format.", bullet_style))
    
    story.append(Paragraph("<b>Non-Functional Requirements:</b>", h2_style))
    story.append(Paragraph("• <b>Data Protection:</b> Cryptographic encryption of user passwords using bcrypt, with API routes validated by JWT auth middleware.", bullet_style))
    story.append(Paragraph("• <b>Performance:</b> Execution times for file uploads and AI parsing queries kept under 3 seconds using asynchronous processes.", bullet_style))
    story.append(Paragraph("• <b>Scalability:</b> Modular Express router file layout and document-oriented MongoDB Atlas clustering to handle high-frequency applicant traffic.", bullet_style))
    story.append(Paragraph("• <b>Responsiveness:</b> Interactive visual dashboard styled with fluid CSS grid layouts fitting desktops, tablets, and phones.", bullet_style))
    
    story.append(PageBreak()) # Force break to page 2 to maintain structured spacing
    
    # Section 4: High-Level and Low-Level Design
    story.append(Paragraph("4. High-Level and Low-Level Design", h1_style))
    story.append(Paragraph("<b>High-Level Design (HLD):</b>", h2_style))
    story.append(Paragraph(
        "The system follows a clean, decoupled three-tier MVC architecture. The client (React 19 SPA) renders the visual panels and communicates via Axios HTTP requests to the backend server (Node.js & Express). The server coordinates business operations, querying the document database (MongoDB Atlas) for structured state storage, and dispatching text queries to external services. Specifically, resume files are extracted in the backend via pdf-parse, formatted, and passed to the Groq Cloud SDK running Llama-3.3-70b-versatile, which returns structured analysis JSON objects. Real-time video meetings use WebRTC with signals passed through specialized database state markers, avoiding complex external signaling servers.",
        body_style
    ))
    
    story.append(Paragraph("<b>Low-Level Design (LLD) & Data Modeling:</b>", h2_style))
    story.append(Paragraph(
        "The backend data model relies on five core schemas in MongoDB, which manage the recruitment lifecycle. These collections maintain reference relations via ObjectId fields to keep state consistency:",
        body_style
    ))
    
    # LLD Table detailing the schema models
    lld_headers = [Paragraph("<b>Model Name</b>", meta_label_style), Paragraph("<b>Key Attributes / Database Schema Details</b>", meta_label_style)]
    lld_rows = [
        lld_headers,
        [Paragraph("<b>User Schema</b>", meta_val_style), Paragraph("name, email, password (hashed), role (candidate/hr/admin), skills, education[], experience[]", meta_val_style)],
        [Paragraph("<b>Job Schema</b>", meta_val_style), Paragraph("company_name, job_role, description, required_skills, rounds, created_by (Ref: User), status (open/closed)", meta_val_style)],
        [Paragraph("<b>Application Schema</b>", meta_val_style), Paragraph("user_id (Ref: User), job_id (Ref: Job), resume_path, ats_score, ats_explanation, current_round, status", meta_val_style)],
        [Paragraph("<b>Test Schema</b>", meta_val_style), Paragraph("job_id (Ref: Job), round_number, title, questions [ {question_type, details, test_cases[]} ]", meta_val_style)],
        [Paragraph("<b>TestSubmission</b>", meta_val_style), Paragraph("test_id (Ref: Test), user_id (Ref: User), application_id (Ref: Application), answers[], tab_switches, total_score", meta_val_style)]
    ]
    lld_table = Table(lld_rows, colWidths=[120, 384])
    lld_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('BACKGROUND', (0,0), (-1,0), c_accent),
        ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e1")),
        ('INNERGRID', (0,0), (-1,-1), 0.25, colors.HexColor("#cbd5e1")),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(lld_table)
    story.append(Spacer(1, 8))
    
    # Section 5: Advantages & Disadvantages
    story.append(Paragraph("5. Advantages & Disadvantages", h1_style))
    story.append(Paragraph("<b>Advantages:</b>", h2_style))
    story.append(Paragraph("• <b>Automated Efficiency:</b> slashes time-to-hire by auto-ranking resumes using an objective, criteria-based match score.", bullet_style))
    story.append(Paragraph("• <b>Unified Pipeline:</b> merges job postings, testing, cheating reports, remote interviews, and offer generation into one portal.", bullet_style))
    story.append(Paragraph("• <b>Constructive Feedback:</b> gives candidate accounts detailed recommendations on missing skills and keyword optimizations.", bullet_style))
    story.append(Paragraph("• <b>Academic Integrity:</b> logs tab-switching counts during technical tests, providing recruiters an objective warning system.", bullet_style))
    
    story.append(Paragraph("<b>Disadvantages:</b>", h2_style))
    story.append(Paragraph("• <b>API Availability:</b> depends entirely on external API connections (Groq API, database hosting); network failures block core functions.", bullet_style))
    story.append(Paragraph("• <b>Bypassable Cheating Detection:</b> client visibility changes track active tab loss, but cannot detect off-screen resources (phones, dual monitors).", bullet_style))
    story.append(Paragraph("• <b>WebRTC Firewall Limits:</b> direct peer connections fail on restricted network types without TURN/STUN relay configurations.", bullet_style))
    
    story.append(Spacer(1, 8))
    
    # Section 6: Conclusion, Future Improvements & Bottlenecks
    story.append(Paragraph("6. Conclusion, Future Improvements & Potential Bottlenecks", h1_style))
    story.append(Paragraph("<b>Conclusion:</b>", h2_style))
    story.append(Paragraph(
        "The Smart Job Tracker successfully constructs an automated, transparent, and cohesive recruitment environment. By replacing fragmented tools with an intelligent, MERN-stack portal, it removes the repetitive strain of manual resume screening and introduces security in applicant assessment, making it an excellent fit for the EP curriculum.",
        body_style
    ))
    
    story.append(Paragraph("<b>Future Improvements:</b>", h2_style))
    story.append(Paragraph("• <b>Blockchain Verification:</b> Store and verify university degree certificates on an immutable blockchain ledger to eliminate candidate fraud.", bullet_style))
    story.append(Paragraph("• <b>Video Interview Analysis:</b> Integrate speech-to-text transcription and facial sentiment analysis to automatically evaluate soft skills.", bullet_style))
    story.append(Paragraph("• <b>Advanced STUN/TURN:</b> Implement a media server layout (SFU) to scale interview rooms to multi-party panels securely.", bullet_style))
    
    story.append(Paragraph("<b>Potential Bottlenecks:</b>", h2_style))
    story.append(Paragraph("• <b>Groq Rate Limits & LLM Latency:</b> High applicant volume could throttle API keys, causing delays in return parsing results (mitigation: job queuing).", bullet_style))
    story.append(Paragraph("• <b>Resume File Failures:</b> Extremely large resume sizes or non-standard PDF formats can fail parser extraction (mitigation: size caps and raw text input fallbacks).", bullet_style))
    
    # Section 7: References
    story.append(Paragraph("7. References", h1_style))
    story.append(Paragraph("1. React 19 Development Guide: <i>https://react.dev/blog/2024/12/05/react-19</i>", bullet_style))
    story.append(Paragraph("2. Express.js REST API Routing Standards: <i>https://expressjs.com/</i>", bullet_style))
    story.append(Paragraph("3. Groq SDK Cloud Model Usage (Llama 3.3): <i>https://console.groq.com/docs</i>", bullet_style))
    story.append(Paragraph("4. WebRTC Peer-to-Peer Protocol Standard Specifications: <i>https://webrtc.org/</i>", bullet_style))
    story.append(Paragraph("5. MongoDB Atlas Document Database Relations: <i>https://www.mongodb.com/docs/</i>", bullet_style))
    
    # Build Document using our NumberedCanvas
    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"Successfully generated PDF: {filename}")

if __name__ == "__main__":
    build_pdf()
