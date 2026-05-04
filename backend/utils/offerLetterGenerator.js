import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

/**
 * ✅ GENERATE OFFER LETTER PDF
 */

export const generateOfferLetter = async (candidateName, jobRole, companyName) => {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ margin: 50 });
        const fileName = `Offer_Letter_${candidateName.replace(/\s+/g, '_')}_${Date.now()}.pdf`;
        const uploadDir = process.env.VERCEL ? "/tmp/uploads" : "uploads";
        const filePath = path.join(uploadDir, fileName);

        // Ensure uploads directory exists
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        const stream = fs.createWriteStream(filePath);
        doc.pipe(stream);

        // --- Header Section ---
        doc.fillColor('#1d4ed8').fontSize(28).font('Helvetica-Bold').text(companyName.toUpperCase(), { align: 'center' });
        doc.moveDown(0.2);
        doc.fillColor('#6b7280').fontSize(10).font('Helvetica').text('Corporate Headquarters • Human Resources Department', { align: 'center' });
        doc.moveDown(2);

        // --- Date & Subject ---
        doc.fillColor('#000000').fontSize(12).font('Helvetica').text(`Date: ${new Date().toLocaleDateString()}`);
        doc.moveDown(1.5);
        doc.fontSize(14).font('Helvetica-Bold').text('OFFER OF EMPLOYMENT', { underline: true, align: 'center' });
        doc.moveDown(2);

        // --- Body ---
        doc.fontSize(12).font('Helvetica-Bold').text(`Dear ${candidateName},`);
        doc.moveDown(1);
        doc.font('Helvetica').lineGap(4).text(
            `Congratulations! We are delighted to officially offer you the position of `, { continued: true }
        ).font('Helvetica-Bold').text(`${jobRole} `, { continued: true })
        .font('Helvetica').text(`at `, { continued: true })
        .font('Helvetica-Bold').text(`${companyName}.`);

        doc.moveDown(1.5);
        doc.font('Helvetica').text(
            `After reviewing your background and our recent interview process, we are highly impressed with your skills and believe that you will be a valuable asset to our team. This role marks the beginning of what we hope will be a long and mutually beneficial journey.`
        );

        doc.moveDown(1.5);
        doc.font('Helvetica-Bold').text('Roles & Responsibilities:');
        doc.font('Helvetica').text(
            `As our ${jobRole}, you will be responsible for executing high-level tasks, collaborating with cross-functional teams, and contributing to the innovative culture at ${companyName}. Specific goals and objectives will be discussed during your onboarding session.`
        );

        doc.moveDown(2);
        doc.font('Helvetica-Bold').text('Next Steps:');
        doc.font('Helvetica').text(
            'We would like to welcome you to our family as soon as possible. Please review the details within our company portal and reach out if you have any questions regarding your benefits package or start date.'
        );

        doc.moveDown(3);
        
        // --- Signature ---
        doc.font('Helvetica-Bold').text('Sincerely,');
        doc.moveDown(0.5);
        doc.fontSize(14).fillColor('#1d4ed8').text('The Talent Acquisition Team');
        doc.fontSize(12).fillColor('#000000').text(companyName);

        // --- Footer ---
        doc.fontSize(8).fillColor('#9ca3af').text(
            'This is a computer-generated offer letter and does not require a physical signature.', 
            50, 700, { align: 'center' }
        );

        doc.end();

        stream.on('finish', () => resolve(filePath));
        stream.on('error', reject);
    });
};
