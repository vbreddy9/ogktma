import React, { useState } from 'react';
import '../styles/MemberRegistrationForm.css';

const generateCaptcha = () => {
  const num1 = Math.floor(Math.random() * 10) + 1;
  const num2 = Math.floor(Math.random() * 10) + 1;
  return { question: `${num1} + ${num2}`, answer: (num1 + num2).toString() };
};

const membershipPrices = {
  "VIP EXCLUSIVE ($5,000)": 5000,
  "VIP SPONSOR ($3,000)": 3000,
  "PREMIUM DOUBLE ($1,500)": 1500,
  "PREMIUM SINGLE ($1,000)": 1000,
  "HALF PAGE ADD ($300)": 300,
  "FULL PAGE ADD ($500)": 500
};

const MemberRegistrationForm = () => {
  const [captcha, setCaptcha] = useState(generateCaptcha());
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    address: '',
    city: '',
    state: '',
    zipcode: '',
    homePhone: '',
    yearJoined: '',
    speciality: '',
    membershipType: '',
    spouseName: '',
    spouseEmail: '',
    spouseOccupation: '',
    spouseSpeciality: '',
    isRangarayan: '',
    children: [{ name: '', age: '' }],
    donation: '',
    captchaAnswer: '',
    termsAccepted: false
  });

  const handleChange = (e, index = null) => {
    const { name, value, type, checked } = e.target;
    if (name === 'termsAccepted') {
      setFormData({ ...formData, [name]: checked });
    } else if (name === 'name' || name === 'age') {
      const children = [...formData.children];
      children[index][name] = value;
      setFormData({ ...formData, children });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const addChild = () => {
    setFormData({ ...formData, children: [...formData.children, { name: '', age: '' }] });
  };

  const calculateTotal = () => {
    const membershipAmount = membershipPrices[formData.membershipType] || 0;
    const donationAmount = parseFloat(formData.donation) || 0;
    return membershipAmount + donationAmount;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (submitting) return;

    if (formData.captchaAnswer !== captcha.answer) {
      alert('Incorrect captcha answer');
      setCaptcha(generateCaptcha());
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch('https://ogktma-backend.vercel.app/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();
      if (!data.success) {
        alert(data.message || 'Submission failed.');
        setSubmitting(false);
        return;
      }

      alert('Form submitted successfully. PDF and confirmation email sent to your inbox.');

      // 👇 Temporarily disable PayPal redirect during testing
      // const totalAmount = calculateTotal();
      // alert('Redirecting to PayPal for payment...');
      // setTimeout(() => {
      //   const paypalURL = `https://www.paypal.com/cgi-bin/webscr?cmd=_xclick&business=president@ogktma.org&item_name=OGKTMA+Membership+Registration&amount=${totalAmount}&currency_code=USD`;
      //   window.location.href = paypalURL;
      // }, 1000);

    } catch (err) {
      console.error(err);
      alert('Server error. Please try again later.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="registration-form" onSubmit={handleSubmit}>
      <h2>Personal Info</h2>
      <div className="form-row">
        <input type="text" name="firstName" placeholder="First Name *" onChange={handleChange} required />
        <input type="text" name="lastName" placeholder="Last Name *" onChange={handleChange} required />
      </div>
      <div className="form-row">
        <input type="email" name="email" placeholder="Email Id *" onChange={handleChange} required />
        <input type="text" name="phone" placeholder="Mobile Number *" onChange={handleChange} required />
      </div>
      <div className="form-row">
        <input type="text" name="address" placeholder="Address *" onChange={handleChange} required />
        <input type="text" name="city" placeholder="City *" onChange={handleChange} required />
      </div>
      <div className="form-row">
        <select name="state" onChange={handleChange} required>
          <option value="">Select State</option>
          <option value="CA">California</option>
          <option value="TX">Texas</option>
          <option value="NY">New York</option>
        </select>
        <input type="text" name="zipcode" placeholder="Zipcode" onChange={handleChange} />
      </div>
      <div className="form-row">
        <input type="text" name="yearJoined" placeholder="Year of joining OGKTMA *" onChange={handleChange} required />
        <input type="text" name="speciality" placeholder="Speciality *" onChange={handleChange} required />
      </div>
      <h2>Membership Type</h2>
      <div className="form-row">
        <select name="membershipType" onChange={handleChange} required>
          <option value="">Select Membership Type</option>
          {Object.keys(membershipPrices).map((label, i) => (
            <option key={i} value={label}>{label}</option>
          ))}
        </select>
      </div>

      <h2>Spouse Details</h2>
      <div className="form-row">
        <input type="text" name="spouseName" placeholder="Spouse Name" onChange={handleChange} />
        <input type="email" name="spouseEmail" placeholder="Spouse Email" onChange={handleChange} />
      </div>
      <div className="form-row">
        <input type="text" name="spouseOccupation" placeholder="Spouse Occupation" onChange={handleChange} />
        <input type="text" name="spouseSpeciality" placeholder="Spouse Speciality" onChange={handleChange} />
      </div>
      <label>She is OGKTMA?:
        <label><input type="radio" name="isRangarayan" value="Yes" onChange={handleChange} /> Yes</label>
        <label><input type="radio" name="isRangarayan" value="No" onChange={handleChange} /> No</label>
      </label>

      <h2>Children Details</h2>
      {formData.children.map((child, index) => (
        <div className="form-row" key={index}>
          <input type="text" name="name" placeholder="Name" value={child.name} onChange={(e) => handleChange(e, index)} />
          <input type="text" name="age" placeholder="Age" value={child.age} onChange={(e) => handleChange(e, index)} />
        </div>
      ))}
      <button type="button" className="add-child" onClick={addChild}>+ Add Child</button>

      <h2>Donations to OGKTMA</h2>
      <div className="form-row">
        <input type="text" name="donation" placeholder="Donation Amount ($)" onChange={handleChange} />
      </div>

      <div className="form-row">
        <strong>Total Payable: ${calculateTotal()}</strong>
      </div>

      <div className="form-row captcha">
        <label>Security Captcha: {captcha.question}</label>
        <input type="text" name="captchaAnswer" onChange={handleChange} required />
      </div>

      <div className="form-row checkbox-row">
        <label className="checkbox-label">
          <input type="checkbox" name="termsAccepted" onChange={handleChange} required />
          I have read and accept the Terms of Service
        </label>
      </div>

      <button type="submit" className="submit-btn" disabled={submitting}>
        {submitting ? 'Submitting...' : 'Submit'}
      </button>
    </form>
  );
};

export default MemberRegistrationForm;
