// server.js
const express = require('express');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const nodemailer = require('nodemailer');
const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');
const os = require('os'); 


dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

const cors = require('cors');
app.use(cors({
  origin: 'https://ogktma-frontend.vercel.app',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(bodyParser.json());

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
    const os = require('os');
    const filePath = path.join(os.tmpdir(), filename);


    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    const logoPath = path.join(__dirname, 'assets', 'ogktma-logo.png');
    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, 40, 30, { width: 60 });
    }

    doc.fontSize(14).font('Helvetica-Bold').text('OGKTMA Convention - Member Registration', 120, 45);

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

    let x = 40, y = 120;
    const rowHeight = 18, col1Width = 160, col2Width = 330;
    doc.fontSize(9);
    details.forEach(([label, value]) => {
      doc.rect(x, y, col1Width, rowHeight).stroke();
      doc.text(label, x + 5, y + 5);
      doc.rect(x + col1Width, y, col2Width, rowHeight).stroke();
      doc.text(value, x + col1Width + 5, y + 5);
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
      'Note: Please bring the PDF hard copy from your mail and submit it at the event entry. This will serve as your boarding pass.',
      x,
      y,
      { align: 'center' }
    );

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

app.post('/register', async (req, res) => {
  const formData = req.body;

  if (!formData.firstName || !formData.email) {
    return res.status(400).json({ success: false, message: 'Missing required fields: firstName and email.' });
  }

  const cleanEmail = formData.email.trim().toLowerCase();
  const membershipAmount = membershipPrices[formData.membershipType] || 0;
  const donationAmount = parseFloat(formData.donation) || 0;
  const totalAmount = membershipAmount + donationAmount;

  // ✅ Respond immediately to frontend
  res.status(200).json({
    success: true,
    message: 'Form submitted successfully. PDF and confirmation email will be sent shortly.'
  });

  // 🕓 Continue email + PDF generation in background
  try {
    const pdfPath = await generatePDF(formData, totalAmount);

    const mailOptions = {
      from: 'info@vr2tech.in',
      to: [cleanEmail, 'info@ogktma.org'],
      subject: 'OGKTMA Member Registration Confirmation',
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

    // ⏱ Cleanup after 10 seconds
    setTimeout(() => {
      if (fs.existsSync(pdfPath)) fs.unlinkSync(pdfPath);
    }, 10000);

    console.log(`✅ Email sent and PDF cleaned up for ${cleanEmail}`);
  } catch (error) {
    console.error('❌ Background processing failed:', error);
    // Optionally: log to external service or email admin
  }
});



app.get('/', (req, res) => {
  res.send('OGKTMA Backend Root is live ✅');
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});


