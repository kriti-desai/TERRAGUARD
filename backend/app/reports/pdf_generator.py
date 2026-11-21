```python
"""
TERRAGUARD PDF Report Generator.
Creates professional location-based subsidence risk reports.
"""

import os
from datetime import datetime, timezone

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    HRFlowable,
)


def generate_location_report(report_data: dict, file_path: str) -> str:
    """Generate a PDF report for a monitored location."""

    os.makedirs(os.path.dirname(file_path) or ".", exist_ok=True)

    document = SimpleDocTemplate(
        file_path,
        pagesize=A4,
        rightMargin=18 * mm,
        leftMargin=18 * mm,
        topMargin=18 * mm,
        bottomMargin=18 * mm,
    )

    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        "TERRAGUARDTitle",
        parent=styles["Title"],
        fontSize=20,
        leading=25,
        alignment=TA_CENTER,
        textColor=colors.HexColor("#17365D"),
        spaceAfter=6,
    )

    subtitle_style = ParagraphStyle(
        "TERRAGUARDSubtitle",
        parent=styles["Normal"],
        fontSize=9,
        alignment=TA_CENTER,
        textColor=colors.HexColor("#526579"),
        spaceAfter=12,
    )

    heading_style = ParagraphStyle(
        "SectionHeading",
        parent=styles["Heading2"],
        fontSize=12,
        textColor=colors.HexColor("#17365D"),
        spaceBefore=12,
        spaceAfter=7,
    )

    body_style = styles["BodyText"]

    story = []

    story.append(Paragraph("TERRAGUARD INTELLIGENCE PLATFORM", title_style))
    story.append(
        Paragraph(
            "Predict. Monitor. Protect. | Subsidence Risk Assessment",
            subtitle_style,
        )
    )

    story.append(
        Paragraph(
            f"Report generated: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}",
            subtitle_style,
        )
    )

    story.append(HRFlowable(width="100%", color=colors.HexColor("#B7C9D6")))
    story.append(Spacer(1, 8))

    story.append(Paragraph("1. LOCATION INFORMATION", heading_style))

    location_rows = [
        ["Location ID", str(report_data.get("location_id", "N/A"))],
        ["Location Name", str(report_data.get("location_name", "N/A"))],
        ["Region", str(report_data.get("region", "N/A"))],
        ["State", str(report_data.get("state", "N/A"))],
        ["Latitude", str(report_data.get("latitude", 0))],
        ["Longitude", str(report_data.get("longitude", 0))],
        ["Elevation (m)", str(report_data.get("elevation_m", 0))],
        ["Dataset", str(report_data.get("dataset_name", "N/A"))],
        ["Observations", str(report_data.get("observations_count", 0))],
    ]

    story.append(_make_table(location_rows))

    story.append(Paragraph("2. SUBSIDENCE RISK ASSESSMENT", heading_style))

    risk_rows = [
        ["Risk Level", str(report_data.get("risk_level", "N/A"))],
        ["Risk Score", str(report_data.get("risk_score", 0))],
        ["Displacement Factor", str(report_data.get("displacement_factor", 0))],
        ["Velocity Factor", str(report_data.get("velocity_factor", 0))],
        ["Rainfall Factor", str(report_data.get("rainfall_factor", 0))],
        ["Mining Factor", str(report_data.get("mining_factor", 0))],
        ["Anomaly Factor", str(report_data.get("anomaly_factor", 0))],
        ["Model Method", str(report_data.get("model_method", "N/A"))],
        ["Assessment Date", str(report_data.get("analysis_date", "N/A"))],
    ]

    story.append(_make_table(risk_rows))

    story.append(Paragraph("3. OBSERVATION DETAILS", heading_style))

    observation_rows = [
        ["Displacement (mm)", str(report_data.get("displacement_mm", 0))],
        [
            "Displacement Velocity (mm/year)",
            str(report_data.get("displacement_velocity_mm_year", 0)),
        ],
        ["Rainfall (mm)", str(report_data.get("rainfall_mm", 0))],
        [
            "Mining Activity Index",
            str(report_data.get("mining_activity_index", 0)),
        ],
        ["Anomaly Score", str(report_data.get("anomaly_score", 0))],
        ["Anomaly Detected", "Yes" if report_data.get("is_anomaly") else "No"],
        ["Recorded Alerts", str(report_data.get("alerts_count", 0))],
    ]

    story.append(_make_table(observation_rows))

    story.append(Paragraph("4. INTERPRETATION AND LIMITATIONS", heading_style))

    story.append(
        Paragraph(
            "This report presents an assessment based on the observations, "
            "risk factors, and model outputs available in TERRAGUARD at the "
            "time of generation. Risk scores and anomaly classifications are "
            "decision-support indicators, not definitive predictions of "
            "ground failure or mine collapse.",
            body_style,
        )
    )

    story.append(Spacer(1, 8))

    story.append(
        Paragraph(
            "Further geological investigation, field verification, and "
            "qualified professional assessment are required before making "
            "operational or public-safety decisions.",
            body_style,
        )
    )

    story.append(Spacer(1, 18))
    story.append(HRFlowable(width="100%", color=colors.HexColor("#B7C9D6")))
    story.append(Spacer(1, 6))

    story.append(
        Paragraph(
            "TERRAGUARD | Evidence-informed subsidence monitoring",
            subtitle_style,
        )
    )

    document.build(story)

    return file_path


def _make_table(rows):
    table = Table(rows, colWidths=[65 * mm, 105 * mm])

    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#EAF0F6")),
                ("TEXTCOLOR", (0, 0), (0, -1), colors.HexColor("#17365D")),
                ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
                ("FONTSIZE", (0, 0), (-1, -1), 8.5),
                ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#C8D3DE")),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (-1, -1), 7),
                ("RIGHTPADDING", (0, 0), (-1, -1), 7),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )

    return table
```
