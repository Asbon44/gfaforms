// GFA Admission Portal - Firebase Integrated
const FIREBASE_URL = "https://general-fashion-academy-forms-default-rtdb.firebaseio.com/";

console.log("GFA Admission Portal: Script Loaded with Firebase.");

// --- FIREBASE HELPERS ---
async function fetchUserRecord(serial) {
    try {
        const response = await fetch(`${FIREBASE_URL}pins/${serial}.json`);
        if (!response.ok) return null;
        return await response.json();
    } catch (e) {
        console.error("Firebase fetch error:", e);
        return null;
    }
}

async function saveUserRecord(serial, updateData) {
    try {
        const response = await fetch(`${FIREBASE_URL}pins/${serial}.json`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updateData)
        });
        return response.ok;
    } catch (e) {
        console.error("Firebase save error:", e);
        return false;
    }
}

// // Initialize Pins (Fallback)
let GFA_DB = []; 

function initDatabase() {
    // defaultPins is now loaded from pins.js
    GFA_DB = typeof defaultPins !== 'undefined' ? defaultPins : [];
    console.log('Local fallback database ready with ' + GFA_DB.length + ' pins.');
}

// --- AUTO-INITIALIZE ON LOAD ---
initDatabase();

// DOM Elements
    const gateSection = document.getElementById('gate-section');
    const formSection = document.getElementById('form-section');
    const successSection = document.getElementById('success-section');
    const loginError = document.getElementById('login-error');

    const inputSerial = document.getElementById('gate-serial');
    const inputPin = document.getElementById('gate-pin');
    const loginBtn = document.getElementById('btn-login');

    const form = document.getElementById('admission-form');
    const readOnlyBanner = document.getElementById('readonly-banner');
    const submitWrapper = document.getElementById('submit-wrapper');
    const readOnlyMsg = document.getElementById('read-only-msg');

    const fashionBgRadios = document.getElementsByName('first_time');
    const prevSchoolDiv = document.getElementById('previous-school-div');
    const currentSerialInput = document.getElementById('current-serial');
    const passportInputEl = document.getElementById('passport-upload');

    // iPhone Safari fix:
    // Do NOT read the file (async) during submit, because Safari may block the submit
    // when it's no longer a direct user gesture. Cache the image when the user selects it.
    let cachedPassportDataUrl = null;
    let cachedPassportFileName = null;
    if (passportInputEl) {
        passportInputEl.addEventListener('change', () => {
            const file = passportInputEl.files && passportInputEl.files[0] ? passportInputEl.files[0] : null;
            cachedPassportDataUrl = null;
            cachedPassportFileName = null;
            if (!file) return;
            cachedPassportFileName = file.name;

            try {
                const reader = new FileReader();
                reader.onload = () => { cachedPassportDataUrl = String(reader.result || ""); };
                reader.onerror = () => {
                    cachedPassportDataUrl = null;
                    console.warn("Passport image could not be cached for download.");
                };
                reader.readAsDataURL(file);
            } catch (e) {
                cachedPassportDataUrl = null;
            }
        });
    }

    // Toggle Previous School Field
    Array.from(fashionBgRadios).forEach(radio => {
        radio.addEventListener('change', () => {
            if (document.getElementById('ft-no').checked) {
                prevSchoolDiv.classList.remove('hidden');
                document.querySelector('textarea[name="previous_school"]').required = true;
            } else {
                prevSchoolDiv.classList.add('hidden');
                document.querySelector('textarea[name="previous_school"]').required = false;
            }
        });
    });

    // Passport Preview Logic
    const passportUpload = document.getElementById('passport-upload');
    const previewImg = document.getElementById('preview-img');
    const previewText = document.getElementById('preview-text');

    if (passportUpload) {
        passportUpload.addEventListener('change', function () {
            if (this.files && this.files[0]) {
                const url = URL.createObjectURL(this.files[0]);
                previewImg.src = url;
                previewImg.style.display = 'block';
                previewText.style.display = 'none';
            } else {
                previewImg.style.display = 'none';
                previewText.style.display = 'inline';
            }
        });
    }

    const downloadBtn = document.getElementById('btn-download');
    let currentActiveRecord = null; // Track the current record for downloads

    if (downloadBtn) {
        downloadBtn.addEventListener('click', () => {
            if (currentActiveRecord) downloadFilledForm(currentActiveRecord);
        });
    }

    // iPhone Safari compatibility: avoid String.prototype.replaceAll (not available on some iOS versions)
    function escapeHtml(str) {
        return String(str)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function downloadFilledForm(record) {
        if (!record || !record.formData) {
            alert("No submitted form data found to download on this device.");
            return;
        }

        const safeSerial = (record.serial || "GFA").replace(/[^A-Z0-9_-]/gi, "_");
        const submittedAt = record.submittedAt || new Date().toISOString();
        const dataObj = record.formData;

        const passportDataUrl = dataObj._passportDataUrl;
        
        const getVal = (key) => escapeHtml(dataObj[key] || "N/A");

        const html = `<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8" />
    <title>GFA Admission Form - ${safeSerial}</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800&display=swap');
        body { font-family: 'Outfit', sans-serif; margin: 0; padding: 40px; background: #f0f4f8; color: #1a202c; line-height: 1.4; }
        .form-container { max-width: 900px; margin: 0 auto; background: white; border: 1px solid #e2e8f0; padding: 40px; box-shadow: 0 10px 25px rgba(0,0,0,0.05); border-radius: 12px; position: relative; }
        
        .header { text-align: center; margin-bottom: 30px; border-bottom: 4px solid #003366; padding-bottom: 20px; position: relative; }
        .header h1 { color: #003366; font-size: 32px; margin: 0; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; }
        .header .sub-title { display: inline-block; background: #FFD700; color: #003366; padding: 6px 30px; border-radius: 50px; font-weight: 700; margin-top: 10px; font-size: 16px; text-transform: uppercase; }
        
        .section { margin-bottom: 20px; border: 1.5px solid #003366; border-radius: 8px; overflow: hidden; }
        .section-header { background: #003366; color: white; padding: 8px 15px; font-weight: 700; font-size: 13px; text-transform: uppercase; display: flex; justify-content: space-between; align-items: center; }
        .section-content { padding: 15px; }
        
        .row { display: flex; gap: 20px; margin-bottom: 12px; }
        .col { flex: 1; }
        .field { margin-bottom: 8px; }
        .label { font-weight: 700; color: #003366; font-size: 11px; text-transform: uppercase; margin-bottom: 2px; }
        .value { border: 1px solid #e2e8f0; background: #f8fafc; padding: 6px 10px; min-height: 18px; font-size: 14px; color: #2d3748; border-radius: 4px; }
        
        .passport-area { width: 150px; height: 180px; border: 2px dashed #cbd5e0; border-radius: 6px; display: flex; align-items: center; justify-content: center; overflow: hidden; background: #f7fafc; }
        .passport-area img { width: 100%; height: 100%; object-fit: cover; }
        
        .footer { text-align: center; margin-top: 30px; font-size: 13px; color: white; background: #003366; padding: 15px; border-radius: 0 0 12px 12px; margin: 30px -40px -40px -40px; }
        .print-btn { position: fixed; top: 20px; right: 20px; background: #003366; color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-weight: 700; box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 100; font-family: 'Outfit', sans-serif; transition: all 0.2s; }
        .print-btn:hover { background: #002244; transform: translateY(-2px); }
        
        @media print {
            .print-btn { display: none; }
            body { padding: 0; background: white; }
            .form-container { box-shadow: none; border: none; padding: 20px; width: 100%; max-width: 100%; }
        }

        .batch-tag { background: #003366; color: white; padding: 10px 20px; border-radius: 4px; font-weight: 800; font-size: 18px; display: inline-block; margin-top: 5px; }
    </style>
</head>
<body>
    <button class="print-btn" onclick="window.print()">Download / Print as PDF</button>

    <div class="form-container">
        <div class="header">
            <img src="logo.PNG" alt="GFA Logo" style="width: 100px; height: auto; margin-bottom: 10px;">
            <h1>GENERAL FASHION ACADEMY</h1>
            <div class="sub-title">ADMISSION APPLICATION FORM</div>
            <div style="margin-top: 15px; font-size: 13px; font-weight: 600;">
                Serial No: <span style="color: #c53030;">${escapeHtml(record.serial || "")}</span> &nbsp;&nbsp;|&nbsp;&nbsp; 
                Date: ${new Date(submittedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
        </div>

        <div class="section">
            <div class="section-header">
                <span>SECTION A: APPLICANT PARTICULARS</span>
                <span style="background: #FFD700; color: #003366; padding: 2px 10px; border-radius: 4px; font-size: 11px;">BRANCH: ${getVal('preferred_branch')}</span>
            </div>
            <div class="section-content">
                <div class="row">
                    <div class="col" style="flex: 3;">
                        <div class="field">
                            <div class="label">Surname</div>
                            <div class="value">${getVal('surname')}</div>
                        </div>
                        <div class="field">
                            <div class="label">First Name & Other Names</div>
                            <div class="value">${getVal('firstname')} ${getVal('othernames')}</div>
                        </div>
                        <div class="row">
                            <div class="col">
                                <div class="label">Gender</div>
                                <div class="value">${getVal('gender')}</div>
                            </div>
                            <div class="col">
                                <div class="label">Date of Birth</div>
                                <div class="value">${getVal('dob')}</div>
                            </div>
                        </div>
                        <div class="field">
                            <div class="label">Place of Birth / Hometown</div>
                            <div class="value">${getVal('pob')} / ${getVal('hometown')}</div>
                        </div>
                    </div>
                    <div class="col" style="flex: 1; display: flex; flex-direction: column; align-items: center;">
                        <div class="label" style="margin-bottom: 5px;">PASSPORT PHOTO</div>
                        <div class="passport-area">
                            ${passportDataUrl ? `<img src="${passportDataUrl}" />` : '<span style="color:#a0aec0;font-size:12px;">No Image</span>'}
                        </div>
                    </div>
                </div>
                <div class="row">
                    <div class="col">
                        <div class="label">Religious Denomination</div>
                        <div class="value">${getVal('religion')}</div>
                    </div>
                    <div class="col">
                        <div class="label">Residential Status</div>
                        <div class="value">${getVal('residential')}</div>
                    </div>
                </div>
            </div>
        </div>

        <div class="section">
            <div class="section-header">SECTION B: CONTACT & BACKGROUND INFORMATION</div>
            <div class="section-content">
                <div class="field">
                    <div class="label">Residential Address (Town, Street, Contact)</div>
                    <div class="value" style="min-height: 40px;">${getVal('contact_address')}</div>
                </div>
                <div class="row">
                    <div class="col">
                        <div class="label">Living Situation</div>
                        <div class="value">${getVal('living_situation')}</div>
                    </div>
                    <div class="col">
                        <div class="label">How did you hear about GFA?</div>
                        <div class="value">${getVal('marketing')}</div>
                    </div>
                </div>
                <div class="field">
                    <div class="label">First time in a fashion center?</div>
                    <div class="value">${getVal('first_time')} ${dataObj.first_time === 'No' ? ` (Previous: ${getVal('previous_school')})` : ''}</div>
                </div>
            </div>
        </div>

        <div class="section">
            <div class="section-header">SECTION C: FAMILY INFORMATION</div>
            <div class="section-content">
                <div class="row">
                    <div class="col">
                        <div class="field">
                            <div class="label">Father's Name & Occupation</div>
                            <div class="value">${getVal('father_name')} — ${getVal('father_job')}</div>
                        </div>
                        <div class="field">
                            <div class="label">Father's Phone Number</div>
                            <div class="value">${getVal('father_phone')}</div>
                        </div>
                    </div>
                    <div class="col">
                        <div class="field">
                            <div class="label">Mother's Name & Occupation</div>
                            <div class="value">${getVal('mother_name')} — ${getVal('mother_job')}</div>
                        </div>
                        <div class="field">
                            <div class="label">Mother's Phone Number</div>
                            <div class="value">${getVal('mother_phone')}</div>
                        </div>
                    </div>
                </div>
                <div style="margin-top: 10px; padding: 12px; background: #fffdf2; border: 1px dashed #e9c46a; border-radius: 6px;">
                    <div class="label" style="color: #856404;">Emergency Contact (Different from parents)</div>
                    <div class="row" style="margin-bottom: 0;">
                        <div class="col">
                            <div class="label">Name</div>
                            <div class="value">${getVal('emergency_name')}</div>
                        </div>
                        <div class="col">
                            <div class="label">Phone Number</div>
                            <div class="value">${getVal('emergency_phone')}</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div class="section">
            <div class="section-header">SECTION D: MEDICAL INFORMATION</div>
            <div class="section-content">
                <div class="row">
                    <div class="col">
                        <div class="label">Family Doctor & Contact</div>
                        <div class="value">${getVal('doctor_name')} (${getVal('doctor_phone')})</div>
                    </div>
                    <div class="col">
                        <div class="label">Asthma / Inhaler Status</div>
                        <div class="value">${getVal('asthma')}</div>
                    </div>
                </div>
                <div class="row">
                    <div class="col">
                        <div class="label">NHIS Card Active & Number</div>
                        <div class="value">${getVal('nhis')} | ${getVal('nhis_number')}</div>
                    </div>
                    <div class="col">
                        <div class="label">Other Special Needs</div>
                        <div class="value">${getVal('other_needs')}</div>
                    </div>
                </div>
            </div>
        </div>

        <div class="row" style="margin-top: 20px;">
            <div class="col" style="flex: 1.5;">
                <div class="label">Agreements & Policies</div>
                <div style="font-size: 12px; color: #4a5568; border: 1px solid #e2e8f0; padding: 10px; border-radius: 6px;">
                    (&#10003;) Agreed to the Code of Behavior and Financial Responsibilities.<br>
                    (&#10003;) Understands that payments made are non-refundable.
                </div>
            </div>
            <div class="col" style="text-align: center;">
                <div class="label">Selected Admission Batch</div>
                <div class="batch-tag">${getVal('admission_batch')}</div>
            </div>
        </div>

        <div class="footer">
            <div style="font-weight: 700; font-size: 16px; margin-bottom: 5px;">CONTACT US ON</div>
            <div>+233 24 426 4872 / +233 54 344 3983</div>
        </div>
    </div>

    <script type="application/json" id="formDataJson">${escapeHtml(JSON.stringify({ serial: record.serial, submittedAt, formData: dataObj }, null, 2))}</script>
</body>
</html>`;

        const blob = new Blob([html], { type: "text/html;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `GFA_Admission_${safeSerial}.html`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    }

    // Handle Login (Local-only)
    loginBtn.addEventListener('click', async () => {
        const serial = inputSerial.value.trim().toUpperCase();
        const pin = inputPin.value.trim();

        if (!serial || !pin) {
            loginError.innerText = "Please enter both Serial and PIN.";
            loginError.style.display = 'block';
            return;
        }

        loginBtn.innerText = "Verifying...";
        loginBtn.disabled = true;

        try {
            // 1. Try Firebase first (Cloud Source of Truth)
            let userRecord = await fetchUserRecord(serial);

            // 2. If not in cloud, check local fallback (Initial use case)
            if (!userRecord) {
                const fallback = GFA_DB.find(u => u.serial === serial && u.pin === pin);
                if (fallback) {
                    userRecord = fallback;
                }
            }

            if (userRecord && userRecord.pin === pin) {
                loginError.style.display = 'none';
                openForm({ ...userRecord, serial });
            } else {
                loginError.innerText = "Invalid Serial Number or PIN. Please check and try again.";
                loginError.style.display = 'block';
            }
        } catch (error) {
            console.error("Login Error:", error);
            loginError.innerText = "An error occurred. Please refresh and try again.";
            loginError.style.display = 'block';
        } finally {
            loginBtn.innerText = "Access Form";
            loginBtn.disabled = false;
        }
    });


    // Open Form State (New or Read-Only)
    function openForm(record) {
        currentActiveRecord = record; // Save for download button
        gateSection.classList.add('hidden');
        formSection.classList.remove('hidden');

        currentSerialInput.value = record.serial || "";
        document.getElementById('hidden-pin').value = record.pin || "";

        if (record.used) {
            // Apply Read-Only Mode
            readOnlyBanner.classList.remove('hidden');
            submitWrapper.classList.add('hidden');
            readOnlyMsg.classList.remove('hidden');
            form.classList.add('read-only');

            // Populate data safely (if present)
            const data = record.formData;
            if (data && typeof data === "object") {
                for (const key in data) {
                    const elems = form.elements[key];
                    if (!elems) continue;
                    if (elems.type === 'file') continue;

                    if (elems.length !== undefined && elems.type !== 'select-one') {
                        // Radio buttons or multiple inputs
                        Array.from(elems).forEach(el => {
                            if (el.value === data[key]) el.checked = true;
                        });
                    } else {
                        if (elems.type === 'checkbox') {
                            elems.checked = (data[key] === true || data[key] === "on");
                        } else {
                            elems.value = data[key];
                        }
                    }
                }

                // Check if we need to show the previous school
                if (data['first_time'] === "No") {
                    prevSchoolDiv.classList.remove('hidden');
                }
            }

            // Lock down inputs (keep layout intact)
            Array.from(form.elements).forEach(el => {
                if (el.id === 'btn-submit' || el.id === 'current-serial') return;
                if (el.type === 'checkbox' || el.type === 'radio' || el.type === 'file' || el.tagName === 'SELECT') {
                    el.disabled = true;
                } else {
                    el.readOnly = true;
                    el.disabled = false;
                }
            });

            // Handle passport visual for Read-Only
            const previewText = document.getElementById('preview-text');
            if (previewText) {
                previewText.innerText = "Submitted\nSafely";
                previewText.style.color = "#137333";
            }
            const pUpload = document.getElementById('passport-upload');
            if (pUpload) {
                pUpload.type = "text";
                pUpload.value = "Image stored securely.";
                pUpload.style.border = "none";
                pUpload.style.background = "transparent";
                pUpload.disabled = true;
            }

            // Allow download of the submitted form on this same device
            if (downloadBtn) {
                downloadBtn.classList.remove('hidden');
                downloadBtn.onclick = () => downloadFilledForm(record);
            }
        } else {
            // New/editable mode
            readOnlyBanner.classList.add('hidden');
            submitWrapper.classList.remove('hidden');
            readOnlyMsg.classList.add('hidden');
            form.classList.remove('read-only');

            if (downloadBtn) {
                downloadBtn.classList.add('hidden');
                downloadBtn.onclick = null;
            }
        }
    }

    // Submit Logic (Mobile-Optimized)
    const btnSubmit = document.getElementById('btn-submit');
    let isSubmitting = false;

    if (btnSubmit) {
        btnSubmit.addEventListener('click', async () => {
            if (isSubmitting) return;

            // Trigger native browser validation
            if (!form.reportValidity()) {
                return;
            }

            isSubmitting = true;

            // Visual feedback
            btnSubmit.innerText = "Processing...";
            btnSubmit.style.pointerEvents = "none";
            btnSubmit.style.opacity = "0.7";

            const serial = (document.getElementsByName('current-serial')[0] || {}).value || "";
            
            // SECURITY CHECK: Re-verify if used in cloud before submission
            const latest = await fetchUserRecord(serial);
            if (latest && latest.used) {
                alert("This serial number has already been used to submit a form. You cannot submit again.");
                location.reload();
                return;
            }


        const formData = new FormData(form);
        const dataObj = {};
        for (const pair of formData.entries()) {
            const key = pair[0];
            const value = pair[1];
            dataObj[key] = (value && typeof value === "object" && "name" in value) ? value.name : value;
        }

        const pin = document.getElementById('hidden-pin').value || "";

        if (typeof cachedPassportFileName !== 'undefined' && cachedPassportFileName) dataObj._passportFileName = cachedPassportFileName;
        if (typeof cachedPassportDataUrl !== 'undefined' && cachedPassportDataUrl) dataObj._passportDataUrl = cachedPassportDataUrl;

        try {
            // Firebase Sync: Mark as used globally
            const updateData = {
                pin,
                serial,
                used: true,
                formData: dataObj,
                submittedAt: new Date().toISOString()
            };

            const saved = await saveUserRecord(serial, updateData);
            
            if (!saved) {
                // If cloud save fails, we still allow local proceed but warn
                console.warn("Cloud synchronization failed.");
            }
            
            // Also update local fallback for immediate consistency
            let index = GFA_DB.findIndex(r => r.serial === serial);
            if (index > -1) {
                GFA_DB[index] = updateData;
            } else {
                GFA_DB.push(updateData);
            }
        } catch (error) {
            console.warn("Processing warning:", error);
        }

        // Prepare FormSubmit fields
        let emailBody = `==================================================\n`;
        emailBody += `     GFA ADMISSION APPLICATION - OFFICIAL REPORT    \n`;
        emailBody += `==================================================\n\n`;
        emailBody += `SERIAL NUMBER    : ${serial}\n`;
        emailBody += `PREFERRED BRANCH : ${dataObj.preferred_branch || 'N/A'}\n`;
        emailBody += `ADMISSION BATCH  : ${dataObj.admission_batch || 'N/A'}\n`;
        emailBody += `SUBMISSION DATE  : ${new Date().toLocaleString()}\n\n`;
        
        emailBody += `--- SECTION A: APPLICANT PARTICULARS ---\n`;
        emailBody += `FULL NAME        : ${dataObj.surname || ''}, ${dataObj.firstname || ''} ${dataObj.othernames || ''}\n`;
        emailBody += `GENDER           : ${dataObj.gender || 'N/A'}\n`;
        emailBody += `DATE OF BIRTH    : ${dataObj.dob || 'N/A'}\n`;
        emailBody += `PLACE OF BIRTH   : ${dataObj.pob || 'N/A'}\n`;
        emailBody += `HOMETOWN/REGION  : ${dataObj.hometown || 'N/A'}\n`;
        emailBody += `RELIGION         : ${dataObj.religion || 'N/A'}\n`;
        emailBody += `RESIDENTIAL STAT : ${dataObj.residential || 'N/A'}\n\n`;

        emailBody += `--- SECTION B: CONTACT & BACKGROUND ---\n`;
        emailBody += `ADDRESS          : ${dataObj.contact_address || 'N/A'}\n`;
        emailBody += `LIVING SITUATION : ${dataObj.living_situation || 'N/A'}\n`;
        emailBody += `MARKETING SOURCE : ${dataObj.marketing || 'N/A'}\n`;
        emailBody += `FIRST TIME?      : ${dataObj.first_time || 'N/A'}\n`;
        if (dataObj.first_time === 'No') {
            emailBody += `PREVIOUS SCHOOL  : ${dataObj.previous_school || 'N/A'}\n`;
        }
        emailBody += `\n`;

        emailBody += `--- SECTION C: FAMILY INFORMATION ---\n`;
        emailBody += `FATHER'S NAME    : ${dataObj.father_name || 'N/A'}\n`;
        emailBody += `FATHER'S JOB     : ${dataObj.father_job || 'N/A'}\n`;
        emailBody += `FATHER'S PHONE   : ${dataObj.father_phone || 'N/A'}\n`;
        emailBody += `MOTHER'S NAME    : ${dataObj.mother_name || 'N/A'}\n`;
        emailBody += `MOTHER'S JOB     : ${dataObj.mother_job || 'N/A'}\n`;
        emailBody += `MOTHER'S PHONE   : ${dataObj.mother_phone || 'N/A'}\n`;
        emailBody += `EMERGENCY CONTACT: ${dataObj.emergency_name || 'N/A'}\n`;
        emailBody += `EMERGENCY PHONE  : ${dataObj.emergency_phone || 'N/A'}\n\n`;

        emailBody += `--- SECTION D: MEDICAL INFORMATION ---\n`;
        emailBody += `FAMILY DOCTOR    : ${dataObj.doctor_name || 'N/A'}\n`;
        emailBody += `DOCTOR PHONE     : ${dataObj.doctor_phone || 'N/A'}\n`;
        emailBody += `ASTHMA STATUS    : ${dataObj.asthma || 'N/A'}\n`;
        emailBody += `NHIS ACTIVE?     : ${dataObj.nhis || 'N/A'}\n`;
        emailBody += `NHIS NUMBER      : ${dataObj.nhis_number || 'N/A'}\n`;
        emailBody += `OTHER NEEDS      : ${dataObj.other_needs || 'N/A'}\n\n`;

        emailBody += `--- AGREEMENTS ---\n`;
        emailBody += `CODE OF BEHAVIOR : AGREED\n`;
        emailBody += `REFUND POLICY    : UNDERSTOOD\n\n`;
        emailBody += `==================================================\n`;
        emailBody += `             END OF APPLICATION REPORT             \n`;
        emailBody += `==================================================\n`;

        const subject = `GFA Application: ${dataObj.admission_batch || 'Batch'} - ${dataObj.preferred_branch || 'Branch'} - ${dataObj.firstname || 'Applicant'} ${dataObj.surname || ''} (${serial})`;
        
        const fsSubject = document.getElementById('fs-subject');
        if (fsSubject) fsSubject.value = subject;

        const fsDetails = document.getElementById('fs-details');
        if (fsDetails) fsDetails.value = emailBody;

        // Final Submission
        form.submit();

        // Safety timeout to allow retry if the browser stays on the same page
        setTimeout(() => {
            isSubmitting = false;
            btnSubmit.style.pointerEvents = "auto";
            btnSubmit.style.opacity = "1";
            btnSubmit.innerText = "Submit Application";
        }, 10000);
    });
}

