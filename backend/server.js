const express = require('express');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const nodemailer = require('nodemailer');
const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

const cors = require('cors');

app.use(cors({
  origin: 'https://ogktma-frontend.vercel.app',
  methods: ['GET', 'POST', 'OPTIONS'], // allow preflight
  allowedHeaders: ['Content-Type'],
}));


const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'info@vr2tech.in',
    pass: 'ubrdxgraugotinxz'
  }
});

const membershipPrices = {
  "VIP EXCLUSIVE ($5,000)": 5000,
  "VIP SPONSOR ($3,000)": 3000,
  "PREMIUM DOUBLE ($1,500)": 1500,
  "PREMIUM SINGLE ($1,000)": 1000,
  "HALF PAGE ADD ($300)": 300,
  "FULL PAGE ADD ($500)": 500
};

const generatePDF = async (formData, totalAmount) => {
  return new Promise(async (resolve, reject) => {
    const doc = new PDFDocument({ margin: 40 });
    const filename = `PaymentDetails_${Date.now()}.pdf`;
    const pdfDir = path.join(__dirname, 'pdfs');
    if (!fs.existsSync(pdfDir)) fs.mkdirSync(pdfDir);
    const filePath = path.join(pdfDir, filename);

    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    const logoPath = path.join(__dirname, 'assets', 'ogktma-logo.png');
      if (fs.existsSync(logoPath)) {
        doc.image(logoPath, 40, 30, { width: 60 }); // top-left logo
      }

      doc.fontSize(14)
        .font('Helvetica-Bold')
        .text('OGKTMA Convention - Member Registration', 120, 45); // right-aligned to logo

    const details = [
      ['Full Name', `${formData.firstName} ${formData.lastName}`],
      ['Email', formData.email],
      ['Phone', formData.phone],
      ['Address', `${formData.address}, ${formData.city}, ${formData.state}, ${formData.zipcode}`],
      ['Year Joined OGKTMA', formData.yearJoined],
      ['Speciality', formData.speciality],
      ['Membership Type', formData.membershipType],
      ['Spouse Name', formData.spouseName],
      ['Spouse Email', formData.spouseEmail],
      ['Spouse Occupation', formData.spouseOccupation],
      ['Spouse Speciality', formData.spouseSpeciality],
      ['Is OGKTMA Member', formData.isRangarayan],
      ['Donation', `$${formData.donation || 0}`],
      ['Total Payable', `$${totalAmount}`]
    ];

    const x = 40;
    let y = 120;
    const rowHeight = 18;
    const col1Width = 160;
    const col2Width = 330;

    doc.fontSize(9);
    details.forEach(([label, value]) => {
      doc.rect(x, y, col1Width, rowHeight).stroke();
      doc.text(label, x + 5, y + 5, { width: col1Width - 10 });

      doc.rect(x + col1Width, y, col2Width, rowHeight).stroke();
      doc.text(value, x + col1Width + 5, y + 5, { width: col2Width - 10 });

      y += rowHeight;
    });

    y += 8;
    doc.font('Helvetica-Bold').fontSize(9).text('Children Details:', x, y, { underline: true });
    y += 16;
    doc.font('Helvetica').fontSize(9);
    formData.children.forEach((child, i) => {
      doc.text(`Child ${i + 1}: ${child.name}, Age: ${child.age}`, x, y);
      y += 14;
    });

    doc.font('Helvetica-Bold').text('For more details, contact: +1-234-567-8900', x, y);
    y += 25;

    const qrURL = 'https://www.google.com/maps/place/Louisville+Marriott+East/@38.218213,-85.5756855';
    const qrData = await QRCode.toDataURL(qrURL);
    const qrBuffer = Buffer.from(qrData.split(',')[1], 'base64');
    doc.fontSize(9).text('Scan for Event Location:', x, y);
    doc.image(qrBuffer, x, y + 12, { width: 80 });

    y += 115;
    doc.fontSize(8).text(
      'Note: Please bring the PDF hard copy from your mail and submit it at the event entry. This will serve as your boarding pass for the event.',
      x,
      y,
      { align: 'center' }
    );
    // Signature section
      const signaturePath = path.join(__dirname, 'assets', 'sign.png');
      if (fs.existsSync(signaturePath)) {
        doc.image(signaturePath, doc.page.width - 150, y + 30, { width: 100 });
        doc.fontSize(9).text('Authorized by OGKTMA', doc.page.width - 150, y + 70);
      }

    doc.end();
    stream.on('finish', () => resolve(filePath));
    stream.on('error', reject);
  });
};

app.post('/api/register', async (req, res) => {
  const formData = req.body;

  if (!formData.firstName || !formData.email) {
    return res.status(400).json({ success: false, message: 'Missing required fields: firstName and email.' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(formData.email)) {
    return res.status(400).json({ success: false, message: 'Invalid email format.' });
  }

  const cleanEmail = formData.email.trim().toLowerCase();
  const membershipAmount = membershipPrices[formData.membershipType] || 0;
  const donationAmount = parseFloat(formData.donation) || 0;
  const totalAmount = membershipAmount + donationAmount;

  try {
    const pdfPath = await generatePDF(formData, totalAmount);

    const mailOptions = {
      from: 'info@vr2tech.in',
      to: [cleanEmail,'info@ogktma.org'],
      subject: 'OGKTMA Member Registration Confirmation',
      text: `
Dear ${formData.firstName},

Thank you for registering for the OGKTMA Convention 2025.

Here is a summary of your submitted information:
- Name: ${formData.firstName} ${formData.lastName}
- Email: ${cleanEmail}
- Phone: ${formData.phone}
- Membership Type: ${formData.membershipType}
- Donation: $${donationAmount}
- Total Payable: $${totalAmount}

Please find the attached PDF for full confirmation details.

For more details, feel free to call us at +1-234-567-8900

Regards,  
OGKTMA Team
      `,
      html: `
        <div style="font-family: Arial, sans-serif; font-size: 15px; color: #333;">
          <p>Dear <strong>${formData.firstName}</strong>,</p>
          <p>Thank you for registering for the <strong>OGKTMA Convention 2025</strong>.</p>
          <p><strong>Here is a summary of your submitted information:</strong></p>
          <ul>
            <li><strong>Name:</strong> ${formData.firstName} ${formData.lastName}</li>
            <li><strong>Email:</strong> ${cleanEmail}</li>
            <li><strong>Phone:</strong> ${formData.phone}</li>
            <li><strong>Membership Type:</strong> ${formData.membershipType}</li>
            <li><strong>Donation:</strong> $${donationAmount}</li>
            <li><strong>Total Payable:</strong> $${totalAmount}</li>
          </ul>
          <p>Please find the attached PDF for full confirmation details.</p>
          <p style="margin-top: 20px;">
            For more details, feel free to call us at
            <a href="tel:+12345678900" style="color: #1a73e8; text-decoration: none;">+1-234-567-8900</a>
          </p>
          <p>Regards,<br/>OGKTMA Team</p>
        </div>
      `,
      attachments: [
        {
          filename: 'PaymentDetails.pdf',
          path: pdfPath
        }
      ]
    };

    await transporter.sendMail(mailOptions);

    setTimeout(() => {
      if (fs.existsSync(pdfPath)) fs.unlinkSync(pdfPath);
    }, 10000);

    res.status(200).json({ success: true, message: 'Form submitted and email sent successfully!' });
  } catch (error) {
    console.error('❌ Email sending error:', error);
    res.status(500).json({ success: false, message: 'Submission failed. Try again later.' });
  }
});
app.get('/api/test', (req, res) => {
  res.send('OGKTMA Backend is running 🎉');
});

app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
