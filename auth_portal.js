/**
 * RadDose Pro Web Portal & License Issuance Engine
 * Version: 3.0 (Commercial Edition)
 */

document.addEventListener('DOMContentLoaded', () => {
  initStreamCounter();
  initCalculator();
  checkExistingLicense();
});

// Mock LocalStorage DB Keys
const STORAGE_KEYS = {
  USERS: 'raddose_users_db',
  ACTIVE_LICENSE: 'raddose_active_license',
  DOWNLOAD_LOGS: 'raddose_download_logs'
};

// State
let currentSelectedPlan = 'Pro';
let streamCount = 1842920;

/* ==========================================================================
   Interactive Hero Stream Counter
   ========================================================================== */
function initStreamCounter() {
  const counterEl = document.getElementById('mockStreamCount');
  if (!counterEl) return;

  setInterval(() => {
    // 20ms trajectory stream simulation (+50 pts every sec)
    streamCount += Math.floor(Math.random() * 8) + 48;
    counterEl.innerText = streamCount.toLocaleString() + ' pts';
  }, 1000);
}

/* ==========================================================================
   ROI Calculator
   ========================================================================== */
function updateCalculator() {
  const linacCount = parseInt(document.getElementById('linacRange').value);
  const patientCount = parseInt(document.getElementById('patientRange').value);

  document.getElementById('linacCountText').innerText = `${linacCount}대`;
  document.getElementById('patientCountText').innerText = `${patientCount.toLocaleString()}건`;

  // Formula:
  // Baseline manual prep: 180 hrs per LINAC per year
  // RadDose reduces 99% of time.
  const timeSaved = Math.round(linacCount * 180 * (patientCount / 500));
  // Cost saved: Average Medical Physicist hourly wage ~ 100,000 KRW
  const moneySavedMillion = Math.round((timeSaved * 100000) / 10000);

  document.getElementById('timeSavedVal').innerText = `${timeSaved.toLocaleString()} 시간 / 년`;
  document.getElementById('moneySavedVal').innerText = `약 ${moneySavedMillion.toLocaleString()}만 원`;
}

function initCalculator() {
  if (document.getElementById('linacRange')) {
    updateCalculator();
  }
}

/* ==========================================================================
   FAQ Accordion
   ========================================================================== */
function toggleFaq(element) {
  const isActive = element.classList.contains('active');
  
  // Close all FAQs
  document.querySelectorAll('.faq-item').forEach(item => {
    item.classList.remove('active');
  });

  if (!isActive) {
    element.classList.add('active');
  }
}

/* ==========================================================================
   Modal Controller & Auth Flow
   ========================================================================== */
function openGoogleAuthModal(plan = 'Pro') {
  currentSelectedPlan = plan;
  const modal = document.getElementById('authModal');
  showStep(1);
  modal.classList.add('active');
}

function openLoginModal() {
  openGoogleAuthModal('Pro');
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.remove('active');
}

function resetAndCloseModal() {
  closeModal('authModal');
  showStep(1);
}

function showStep(stepNum) {
  document.querySelectorAll('.modal-step').forEach(step => {
    step.classList.remove('active');
  });
  const targetStep = document.getElementById(`modalStep${stepNum}`);
  if (targetStep) targetStep.classList.add('active');
}

/* ==========================================================================
   Google 1-Click Simulation & License Generation
   ========================================================================== */
function handleGoogleSignIn() {
  // 사용자가 폼에 입력해 둔 값이 있으면 최우선 적용
  const typedHosp = (document.getElementById('regHospital') && document.getElementById('regHospital').value.trim()) || '';
  const typedName = (document.getElementById('regName') && document.getElementById('regName').value.trim()) || '';
  const typedEmail = (document.getElementById('regEmail') && document.getElementById('regEmail').value.trim()) || '';

  showStep(2);

  const finalHosp = typedHosp || '신규 등록 병원 방사선종양학과';
  const finalName = typedName || '의학물리학자';
  const finalEmail = typedEmail || 'physicist@hospital.kr';

  setTimeout(() => {
    issueTrialLicense(finalHosp, finalName, finalEmail, 'Google OAuth 2.0');
  }, 1200);
}

function handleDirectSubmit(event) {
  event.preventDefault();
  const hospital = document.getElementById('regHospital').value.trim();
  const name = document.getElementById('regName').value.trim();
  const email = document.getElementById('regEmail').value.trim();

  if (!hospital || !name || !email) {
    showToast('모든 필수 정보를 입력해주세요.', 'error');
    return;
  }

  showStep(2);
  setTimeout(() => {
    issueTrialLicense(hospital, name, email, 'Direct Hospital Form');
  }, 1200);
}

function generateSerialKey() {
  // Format: RD2026-PRO-XXXX-YYYY
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let p1 = '';
  let p2 = '';
  for (let i = 0; i < 4; i++) {
    p1 += chars.charAt(Math.floor(Math.random() * chars.length));
    p2 += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `RD2026-PRO-${p1}-${p2}`;
}

function issueTrialLicense(hospital, name, email, authMethod) {
  const serialKey = generateSerialKey();
  
  // Calculate Expiry: Today + 30 Days
  const now = new Date();
  const expiryDate = new Date();
  expiryDate.setDate(now.getDate() + 30);
  const expiryStr = expiryDate.toISOString().split('T')[0];

  const licenseData = {
    serialKey: serialKey,
    hospital: hospital,
    name: name,
    email: email,
    plan: currentSelectedPlan || 'Pro',
    authMethod: authMethod,
    issuedAt: now.toISOString(),
    expiryDate: expiryStr,
    status: 'ACTIVE_30_DAY_TRIAL',
    features: {
      trajectoryRate: '20ms',
      zeroQaEngine: true,
      kins10sReport: true,
      unlimitedLinac: true,
      tripleBackup: true
    }
  };

  // Save to LocalStorage DB
  saveLicenseToDb(licenseData);

  // Update UI
  document.getElementById('issuedHospitalName').innerText = hospital;
  document.getElementById('issuedUserName').innerText = name;
  document.getElementById('issuedSerialKey').innerText = serialKey;
  document.getElementById('issuedExpiryText').innerText = `만료일: ${expiryStr} (30일 무료 체험)`;

  // Show Step 3
  showStep(3);

  // Trigger Confetti Celebration!
  triggerConfetti();

  showToast(`🎉 30일 무료 Pro 라이선스가 발급되었습니다!`, 'success');
}

function saveLicenseToDb(licenseData) {
  try {
    let users = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
    users.push(licenseData);
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    localStorage.setItem(STORAGE_KEYS.ACTIVE_LICENSE, JSON.stringify(licenseData));
  } catch (e) {
    console.warn('LocalStorage save error:', e);
  }
}

function checkExistingLicense() {
  try {
    const active = JSON.parse(localStorage.getItem(STORAGE_KEYS.ACTIVE_LICENSE));
    if (active && active.serialKey) {
      console.log('Found active RadDose license in local DB:', active);
    }
  } catch (e) {}
}

/* ==========================================================================
   License Actions (Copy, Download .key, Download Setup .exe)
   ========================================================================== */
function copyLicenseKey() {
  const serialKey = document.getElementById('issuedSerialKey').innerText;
  
  if (navigator.clipboard) {
    navigator.clipboard.writeText(serialKey).then(() => {
      onCopySuccess();
    }).catch(() => fallbackCopy(serialKey));
  } else {
    fallbackCopy(serialKey);
  }
}

function fallbackCopy(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  document.body.appendChild(ta);
  ta.select();
  document.execCommand('copy');
  document.body.removeChild(ta);
  onCopySuccess();
}

function onCopySuccess() {
  const btnText = document.getElementById('copyBtnText');
  const icon = document.getElementById('copyIcon');
  if (btnText) btnText.innerText = '복사됨!';
  if (icon) icon.className = 'fa-solid fa-check text-emerald';

  showToast('📋 라이선스 키가 클립보드에 복사되었습니다!', 'info');

  setTimeout(() => {
    if (btnText) btnText.innerText = '키 복사';
    if (icon) icon.className = 'fa-solid fa-copy';
  }, 2500);
}

function downloadLicenseFile() {
  const active = JSON.parse(localStorage.getItem(STORAGE_KEYS.ACTIVE_LICENSE)) || {
    serialKey: document.getElementById('issuedSerialKey').innerText,
    hospital: document.getElementById('issuedHospitalName').innerText,
    name: document.getElementById('issuedUserName').innerText,
    plan: 'Pro 30-Day Trial',
    issuedAt: new Date().toISOString()
  };

  const fileContent = JSON.stringify(active, null, 2);
  const blob = new Blob([fileContent], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `RadDose_License_${active.serialKey}.key`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  showToast('📄 라이선스 파일 (.key)이 다운로드되었습니다.', 'success');
}

function triggerSetupDownload() {
  showToast('⬇️ RadDose Setup v3.0 정식 설치 프로그램 다운로드를 시작합니다...', 'info');

  const a = document.createElement('a');
  a.href = 'RadDose_Setup_v3.0.exe';
  a.download = 'RadDose_Setup_v3.0.exe';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  setTimeout(() => {
    showToast('✅ 다운로드 완료! RadDose_Setup_v3.0.exe를 실행하세요.', 'success');
  }, 1000);
}

/* ==========================================================================
   Report Generation Demo Simulation
   ========================================================================== */
function simulateReportGen() {
  showToast('⚡ Zero-QA 엔진이 20ms 트라젝토리 1,842,920개를 정합 중입니다...', 'info');
  
  setTimeout(() => {
    showToast('📋 KINS 고시 제2024-XX호 정기검사 법정 보고서(PDF/Excel)가 10초 만에 생성되었습니다!', 'success');
  }, 1500);
}

/* ==========================================================================
   Confetti & Toast Helpers
   ========================================================================== */
function triggerConfetti() {
  if (typeof confetti === 'function') {
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 }
    });
    setTimeout(() => {
      confetti({
        particleCount: 50,
        angle: 60,
        spread: 55,
        origin: { x: 0 }
      });
      confetti({
        particleCount: 50,
        angle: 120,
        spread: 55,
        origin: { x: 1 }
      });
    }, 250);
  }
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <i class="fa-solid ${type === 'success' ? 'fa-circle-check text-emerald' : 'fa-circle-info text-cyan'}"></i>
    <span>${message}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}
