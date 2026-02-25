// <<<<<<<<<<<< ใส่ URL ของ WEB APP จาก GOOGLE APPS SCRIPT ตรงนี้ >>>>>>>>>>>>>
const GAS_URL =
  "https://script.google.com/macros/s/AKfycbwz_WIhmE84bYpcTkMrE6tK5J3SQDlxDH3W5Dv3Pq3P7kWxVxegU5RNp0x-QmSCcsHspw/exec";
// <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<

if (typeof Html5QrcodeScanner === "undefined") {
  const script = document.createElement("script");
  script.src = "https://unpkg.com/html5-qrcode";
  document.head.appendChild(script);
}

const MAINTENANCE_ENABLED = false;
const RE_ENABLE_DATETIME_STRING = "2025-07-23T02:00:00";

function showLoading(title = "กำลังโหลด...") {
  Swal.fire({
    title: title,
    allowOutsideClick: false,
    didOpen: () => {
      Swal.showLoading();
    },
  });
}

function apiCall(action, payload) {
  showLoading("กำลังประมวลผล...");
  return fetch(GAS_URL, {
    method: "POST",
    redirect: "follow",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ action, payload }),
  })
    .then((res) => res.json())
    .then((res) => {
      Swal.close();
      if (res.status === "error") throw new Error(res.message);
      return res.data;
    })
    .catch((err) => {
      Swal.fire({ icon: "error", title: "เกิดข้อผิดพลาด", text: err.message });
      throw err;
    });
}

function hashPassword(password) {
  return CryptoJS.SHA256(password).toString();
}

document.addEventListener("DOMContentLoaded", () => {
  const page = window.location.pathname.split("/").pop() || "index.html";
  const yearSpan = document.getElementById("copyright-year");
  if (yearSpan) yearSpan.textContent = new Date().getFullYear();
  if (page.includes("index.html")) handleLoginPage();
  else if (page.includes("register.html")) handleRegisterPage();
  else if (page.includes("dashboard.html")) handleDashboardPage();
  else if (page.includes("admin.html")) handleAdminPage();
});

// === Login Page (รหัสผ่าน & OTP) ===
function handleLoginPage() {
  if (MAINTENANCE_ENABLED && new Date() < new Date(RE_ENABLE_DATETIME_STRING)) {
    document.querySelector(".auth-card").style.display = "none";
    Swal.fire({
      icon: "info",
      title: "ปิดปรับปรุงระบบชั่วคราว",
      allowOutsideClick: false,
      showConfirmButton: false,
    });
    return;
  }

  const rememberedUser =
    localStorage.getItem("loggedInUser") ||
    sessionStorage.getItem("loggedInUser");
  if (rememberedUser) {
    window.location.href = JSON.parse(rememberedUser).isAdmin
      ? "admin.html"
      : "dashboard.html";
    return;
  }

  // 1. Login แบบรหัสผ่าน
  const loginForm = document.getElementById("loginForm");
  if (loginForm) {
    loginForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const phone = document.getElementById("phone").value;
      const password = document.getElementById("password").value;
      const rememberMe = document.getElementById("rememberMe").checked;
      apiCall("login", { phone, hashedPassword: hashPassword(password) })
        .then((data) => {
          if (rememberMe)
            localStorage.setItem("loggedInUser", JSON.stringify(data.user));
          else
            sessionStorage.setItem("loggedInUser", JSON.stringify(data.user));
          Swal.fire({
            icon: "success",
            title: "เข้าสู่ระบบสำเร็จ",
            timer: 1500,
            showConfirmButton: false,
          }).then(() => {
            window.location.href = data.user.isAdmin
              ? "admin.html"
              : "dashboard.html";
          });
        })
        .catch(console.error);
    });
  }

  // 2. Login แบบ OTP
  const loginOtpForm = document.getElementById("loginOtpForm");
  if (loginOtpForm) {
    loginOtpForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const identifier = document.getElementById("otpIdentifier").value;

      apiCall("requestEmailOtp", { identifier }).then((otpResponse) => {
        let timerInterval;
        Swal.fire({
          title: "ยืนยันรหัส OTP",
          html: `<div class="text-start mt-2"><p class="text-muted small mb-2">รหัสส่งไปที่อีเมลแล้ว</p><p class="small fw-bold mb-3 text-info">Ref: ${otpResponse.refno}</p><input id="swal-input-otp-login" class="form-control text-center fs-4 py-2" placeholder="รหัส 6 หลัก" maxlength="6"><div id="otp-timer-login" class="mt-3 text-center small text-muted"></div></div>`,
          showCancelButton: true,
          confirmButtonText: "เข้าสู่ระบบ",
          confirmButtonColor: "#0ea5e9",
          preConfirm: () => {
            const val = document.getElementById("swal-input-otp-login").value;
            if (!val) Swal.showValidationMessage("กรุณากรอกรหัส OTP!");
            return val;
          },
          didOpen: () => {
            const timerEl = document.getElementById("otp-timer-login");
            let timeLeft = 300;
            timerInterval = setInterval(() => {
              timeLeft--;
              const m = Math.floor(timeLeft / 60)
                .toString()
                .padStart(2, "0");
              const s = (timeLeft % 60).toString().padStart(2, "0");
              timerEl.innerHTML = `หมดอายุใน ${m}:${s} นาที`;
              if (timeLeft <= 0) {
                clearInterval(timerInterval);
                timerEl.innerHTML = "รหัสหมดอายุแล้ว";
              }
            }, 1000);
          },
          willClose: () => clearInterval(timerInterval),
        }).then((res) => {
          if (res.isConfirmed && res.value) {
            apiCall("verifyEmailOtp", {
              identifier,
              otp: res.value,
              isForLogin: true,
            }).then((data) => {
              // เก็บแค่ Session ไม่ต้องจำรหัสผ่าน
              sessionStorage.setItem("loggedInUser", JSON.stringify(data.user));
              Swal.fire({
                icon: "success",
                title: "เข้าสู่ระบบสำเร็จ",
                timer: 1500,
                showConfirmButton: false,
              }).then(() => {
                window.location.href = data.user.isAdmin
                  ? "admin.html"
                  : "dashboard.html";
              });
            });
          }
        });
      });
    });
  }

  // ลืมรหัสผ่าน
  const forgotPasswordLink = document.getElementById("forgotPasswordLink");
  if (forgotPasswordLink) {
    forgotPasswordLink.addEventListener("click", (e) => {
      e.preventDefault();
      Swal.fire({
        title: "ลืมรหัสผ่าน",
        html: `<input id="swal-input-identifier" type="text" class="form-control" placeholder="เบอร์โทร หรือ อีเมล">`,
        showCancelButton: true,
        confirmButtonText: "ขอ OTP",
        preConfirm: () => {
          const val = document.getElementById("swal-input-identifier").value;
          if (!val) Swal.showValidationMessage("กรุณากรอกข้อมูล!");
          return val;
        },
      }).then((res) => {
        if (res.isConfirmed && res.value) {
          apiCall("requestEmailOtp", { identifier: res.value }).then(
            (otpResponse) => {
              Swal.fire({
                title: "ยืนยัน OTP (ลืมรหัส)",
                html: `<input id="swal-input-otp" class="form-control text-center fs-4" placeholder="รหัส 6 หลัก" maxlength="6">`,
                showCancelButton: true,
                confirmButtonText: "ยืนยัน",
                preConfirm: () => {
                  const val = document.getElementById("swal-input-otp").value;
                  if (!val) Swal.showValidationMessage("กรุณากรอกรหัส!");
                  return val;
                },
              }).then((otpRes) => {
                if (otpRes.isConfirmed && otpRes.value) {
                  apiCall("verifyEmailOtp", {
                    identifier: res.value,
                    otp: otpRes.value,
                  }).then(() => {
                    Swal.fire({
                      title: "ตั้งรหัสใหม่",
                      html: `<input id="swal-new-pass" type="password" class="form-control" placeholder="รหัสผ่านใหม่">`,
                      showCancelButton: true,
                      confirmButtonText: "บันทึก",
                      preConfirm: () => {
                        const val =
                          document.getElementById("swal-new-pass").value;
                        if (!val) Swal.showValidationMessage("กรุณากรอกรหัส!");
                        return val;
                      },
                    }).then((passRes) => {
                      if (passRes.isConfirmed && passRes.value) {
                        apiCall("updatePassword", {
                          identifier: res.value,
                          newHashedPassword: hashPassword(passRes.value),
                        }).then(() =>
                          Swal.fire("สำเร็จ", "เปลี่ยนรหัสแล้ว", "success")
                        );
                      }
                    });
                  });
                }
              });
            }
          );
        }
      });
    });
  }
}

// === Register ===
function handleRegisterPage() {
  const registerForm = document.getElementById("registerForm");
  const registerBtn = document.getElementById("registerBtn");
  const policyCheckbox = document.getElementById("policyCheckbox");

  if (policyCheckbox)
    policyCheckbox.addEventListener("change", function () {
      registerBtn.disabled = !this.checked;
    });
  if (registerForm) {
    registerForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const firstName = document.getElementById("firstName").value;
      const lastName = document.getElementById("lastName").value;
      const phone = document.getElementById("phone").value;
      const email = document.getElementById("email").value;
      const password = document.getElementById("password").value;
      const confirmPassword = document.getElementById("confirmPassword").value;
      if (password !== confirmPassword) {
        Swal.fire({
          title: "ข้อผิดพลาด",
          text: "รหัสผ่านไม่ตรงกัน",
          icon: "error",
        });
        return;
      }
      apiCall("register", {
        firstName,
        lastName,
        phone,
        email,
        hashedPassword: hashPassword(password),
      }).then(() => {
        Swal.fire({
          icon: "success",
          title: "สมัครสมาชิกสำเร็จ!",
          timer: 2000,
          showConfirmButton: false,
        }).then(() => (window.location.href = "index.html"));
      });
    });
  }
}

// === Dashboard (ลูกค้า) ===
function handleDashboardPage() {
  const rememberedUser =
    localStorage.getItem("loggedInUser") ||
    sessionStorage.getItem("loggedInUser");
  if (!rememberedUser) {
    window.location.href = "index.html";
    return;
  }
  const loggedInUser = JSON.parse(rememberedUser);
  if (loggedInUser.isAdmin) {
    window.location.href = "admin.html";
    return;
  }

  apiCall("getFullDashboardData", { phone: loggedInUser.phone })
    .then((data) => {
      renderDashboard(data.user, data.notifications, data.rewards);
    })
    .catch(() => {
      localStorage.removeItem("loggedInUser");
      sessionStorage.removeItem("loggedInUser");
      window.location.href = "index.html";
    });
}

function renderDashboard(user, notifications, rewards) {
  const app = document.getElementById("app");
  const rewardsByCategory = rewards.reduce((acc, reward) => {
    (acc[reward.category] = acc[reward.category] || []).push(reward);
    return acc;
  }, {});
  const cleanPhone = user.phone.replace(/'/g, ""); // ล้างเครื่องหมาย '

  let expiryMessageHtml = `<p class="mb-0 text-white-50 small"><i class="bi bi-info-circle me-1"></i> แต้มหมดอายุทุก 31 ธ.ค. ของปีถัดไป</p>`;
  if (user.expiringPoints > 0) {
    expiryMessageHtml = `<div class="bg-white text-danger px-3 py-1 rounded-pill d-inline-block small fw-bold shadow-sm" style="animation: pulse 2s infinite;"><i class="bi bi-exclamation-triangle-fill me-1"></i> หมดอายุ ${user.expiringPoints} แต้ม ภายใน ${user.expiryDate}</div>`;
  }

  const customStyles = `<style>body { background: linear-gradient(-45deg, #e0e7ff, #f8fafc, #ede9fe, #f1f5f9); background-size: 400% 400%; animation: gradientBG 15s ease infinite; } @keyframes gradientBG { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } } @keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(1.05); } 100% { transform: scale(1); } } .swipe-container::-webkit-scrollbar { display: none; } .swipe-container { -ms-overflow-style: none; scrollbar-width: none; } .sidebar-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(3px); z-index: 1049; opacity: 0; visibility: hidden; transition: all 0.3s ease; } .sidebar-overlay.show { opacity: 1; visibility: visible; } .sidebar-menu { position: fixed; top: 0; left: -300px; width: 280px; height: 100vh; background: #ffffff; box-shadow: 4px 0 25px rgba(0,0,0,0.15); z-index: 1050; transition: left 0.3s cubic-bezier(0.4, 0, 0.2, 1); display: flex; flex-direction: column; overflow-y: auto; } .sidebar-menu.open { left: 0; } .menu-item { padding: 16px 24px; color: #475569; display: flex; align-items: center; gap: 15px; cursor: pointer; transition: background 0.2s, color 0.2s; font-weight: 500; font-size: 1.05rem; } .menu-item i { font-size: 1.3rem; color: #94a3b8; } .menu-item:hover, .menu-item.active { background: #f8fafc; color: #4f46e5; } .menu-item:hover i, .menu-item.active i { color: #4f46e5; } @media (max-width: 767.98px) { .mobile-section { display: none; } .mobile-section.active { display: block; } }</style>`;

  // 🔥 บัตรสมาชิกแนวนอน ขอบมน (แก้ไขบั๊กไอคอนทับชื่อแล้ว)
  const memberCardHtml = `
    <div class="card border-0 shadow-lg mb-4 position-relative overflow-hidden" style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: white; border-radius: 20px; min-height: 200px;">
        <div class="position-absolute top-0 start-0 p-4" style="font-size: 12rem; line-height: 1; transform: translate(-20%, -30%); opacity: 0.08; z-index: 0;"><i class="bi bi-credit-card-2-front-fill"></i></div>
        
        <div class="card-body p-4 position-relative d-flex justify-content-between align-items-center h-100" style="z-index: 1;">
            
            <div class="d-flex flex-column justify-content-center h-100" style="flex: 1; padding-right: 15px;">
                <div>
                    <h5 class="fw-bold mb-1 text-truncate" style="letter-spacing: 0.5px; text-shadow: 1px 1px 3px rgba(0,0,0,0.2);">${user.firstName} ${user.lastName}</h5>
                    <p class="mb-0 small" style="opacity: 0.85;"><i class="bi bi-telephone-fill me-1"></i>${cleanPhone}</p>
                </div>
                
                <div class="mt-4 mb-2">
                    <p class="mb-0 small" style="opacity: 0.85;">แต้มสะสม</p>
                    <h1 class="display-3 fw-bold mb-0" style="letter-spacing: -2px; text-shadow: 2px 2px 5px rgba(0,0,0,0.3); line-height: 1;">${user.totalPoints}</h1>
                </div>

                <div>
                     ${expiryMessageHtml}
                </div>
            </div>

            <div class="bg-white p-2 rounded-4 shadow-sm flex-shrink-0 d-flex flex-column align-items-center justify-content-center" style="width: 120px; height: 140px;">
                <img src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${cleanPhone}" alt="QR" style="width: 100%; height: auto; display: block; border-radius: 8px;">
                <span class="text-dark fw-bold mt-1" style="font-size: 0.65rem;">สแกนสะสมแต้ม</span>
            </div>

        </div>
    </div>
  `;

  app.innerHTML =
    customStyles +
    `
        <div class="sidebar-overlay" id="sidebarOverlay"></div>
        <div class="sidebar-menu" id="sidebarMenu">
            <div class="p-4 bg-light d-flex justify-content-between align-items-center"><div class="d-flex align-items-center"><div class="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center me-2" style="width: 40px; height: 40px;"><i class="bi bi-person-fill"></i></div><div><h6 class="mb-0 fw-bold text-dark text-truncate" style="max-width: 140px;">${
              user.firstName
            }</h6><small class="text-muted">${
      user.memberId
    }</small></div></div><button type="button" class="btn-close" id="closeSidebarBtn"></button></div>
            <div class="py-2 d-flex flex-column flex-grow-1"><div class="small text-muted fw-bold px-4 py-2 mt-2">เมนูหลัก</div><div class="menu-item active" data-target="tab-home"><i class="bi bi-house-door-fill"></i> หน้าหลัก (คะแนน)</div><div class="menu-item" data-target="tab-rewards"><i class="bi bi-gift-fill"></i> แลกของรางวัล</div><div class="menu-item" data-target="tab-history"><i class="bi bi-receipt"></i> ประวัติรายการ</div><div class="small text-muted fw-bold px-4 py-2 mt-4">บัญชีของฉัน</div><div class="menu-item" id="menuMobileSettings"><i class="bi bi-gear-fill"></i> ตั้งค่าข้อมูลส่วนตัว</div><div class="menu-item text-danger mt-auto border-top" id="menuMobileLogout"><i class="bi bi-box-arrow-right text-danger"></i> ออกจากระบบ</div></div>
        </div>

        <div class="container-fluid py-2" style="max-width: 1000px;">
            <header class="d-flex justify-content-between align-items-center mb-4 bg-white p-3 p-md-4 rounded-4 shadow-sm" style="border: 1px solid rgba(0,0,0,0.05); background: rgba(255,255,255,0.85) !important; backdrop-filter: blur(10px);">
                <div class="d-flex align-items-center"><button id="burgerBtn" class="btn btn-light rounded-circle shadow-sm me-3 d-md-none d-flex align-items-center justify-content-center" style="width: 45px; height: 45px; color: #4f46e5;"><i class="bi bi-list fs-4"></i></button><div><h3 class="fw-bold mb-0 text-dark fs-5 fs-md-3">สวัสดี, ${
                  user.firstName
                } 🌟</h3></div></div>
                <div class="d-flex align-items-center">
                    <div class="desktop-controls d-none d-md-flex align-items-center"><div id="settingsBtnDesktop" class="me-3" style="cursor: pointer;" title="ตั้งค่าข้อมูลส่วนตัว"><div class="bg-light rounded-circle d-flex align-items-center justify-content-center shadow-sm" style="width: 45px; height: 45px; color: #64748b; font-size: 1.3rem;"><i class="bi bi-gear-fill"></i></div></div></div>
                    <div id="notificationBellBtn" class="position-relative me-0 me-md-4" style="cursor: pointer;"><div class="bg-light rounded-circle d-flex align-items-center justify-content-center shadow-sm" style="width: 45px; height: 45px; color: #4f46e5; font-size: 1.3rem;"><i class="bi bi-bell-fill"></i></div>${
                      notifications.length > 0
                        ? `<span class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger shadow-sm border border-white" style="font-size: 0.75rem;">${notifications.length}</span>`
                        : ""
                    }</div>
                    <div class="desktop-controls d-none d-md-flex align-items-center"><button id="logoutBtnDesktop" class="btn btn-outline-danger px-4 rounded-pill fw-medium"><i class="bi bi-box-arrow-right me-2"></i>ออกจากระบบ</button></div>
                </div>
            </header>

            <main class="main-content-wrapper">
                <div id="tab-home" class="mobile-section active">
                    ${memberCardHtml}

                    <div class="row g-3 mb-4">
                        <div class="col-12"><div class="card border-0 rounded-4 shadow-sm bg-white p-2 text-center d-flex flex-row justify-content-around align-items-center"><div class="p-2 cursor-pointer" onclick="document.querySelector('.menu-item[data-target=tab-rewards]').click()"><div class="bg-light text-success rounded-circle d-flex align-items-center justify-content-center mx-auto mb-2" style="width: 50px; height: 50px;"><i class="bi bi-gift fs-4"></i></div><span class="small fw-medium text-dark">แลกรางวัล</span></div><div class="p-2 cursor-pointer" onclick="document.getElementById('notificationBellBtn').click()"><div class="bg-light text-info rounded-circle d-flex align-items-center justify-content-center mx-auto mb-2" style="width: 50px; height: 50px;"><i class="bi bi-newspaper fs-4"></i></div><span class="small fw-medium text-dark">ข่าวสาร</span></div><div class="p-2 cursor-pointer" onclick="window.open('https://line.me/R/ti/p/@732fqlwh', '_blank')"><div class="bg-light text-primary rounded-circle d-flex align-items-center justify-content-center mx-auto mb-2" style="width: 50px; height: 50px;"><i class="bi bi-headset fs-4"></i></div><span class="small fw-medium text-dark">ติดต่อแอดมิน</span></div></div></div>
                    </div>
                </div>

                <div class="row g-4"><div class="col-lg-7 col-xl-8"><div id="tab-rewards" class="mobile-section"><div class="card border-0 rounded-4 shadow-sm h-100 bg-white"><div class="card-header bg-transparent border-0 pt-4 px-4 pb-0"><h5 class="fw-bold text-dark mb-0"><i class="bi bi-gift-fill text-success me-2"></i>แลกของรางวัล</h5></div><div class="card-body p-0 pt-2 pb-4 overflow-hidden">${
                  Object.keys(rewardsByCategory).length > 0
                    ? Object.keys(rewardsByCategory)
                        .map(
                          (category) =>
                            `<div class="d-flex justify-content-between align-items-end mt-4 mb-3 px-4"><h6 class="text-primary fw-bold mb-0">${category}</h6></div><div class="d-flex flex-nowrap overflow-x-auto gap-3 px-4 pb-3 swipe-container" style="-webkit-overflow-scrolling: touch; scroll-snap-type: x mandatory;">${rewardsByCategory[
                              category
                            ]
                              .map((reward) => {
                                const cashText =
                                  reward.cashRequired > 0
                                    ? ` + ${reward.cashRequired}฿`
                                    : "";
                                return `<div class="card h-100 border rounded-4 shadow-sm flex-shrink-0" style="width: 250px; border-color: #f1f5f9 !important; scroll-snap-align: start;"><div class="card-body p-3 d-flex flex-column"><div class="d-flex justify-content-between align-items-start mb-2"><h6 class="mb-0 fw-bold text-dark text-truncate pe-2" style="max-width: 80%;">${
                                  reward.name
                                }</h6>${
                                  String(reward.isNew).toUpperCase() === "TRUE"
                                    ? '<span class="badge bg-danger rounded-pill" style="font-size: 0.65rem;">ใหม่</span>'
                                    : ""
                                }</div><p class="small text-muted mb-3 flex-grow-1" style="font-size: 0.8rem; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${
                                  reward.description
                                }</p><button class="btn btn-sm w-100 rounded-pill fw-medium redeem-btn shadow-sm mt-auto" data-reward-id="${
                                  reward.rewardId
                                }" data-reward-name="${reward.name}" ${
                                  user.totalPoints < reward.pointsRequired
                                    ? "disabled"
                                    : ""
                                } style="${
                                  user.totalPoints >= reward.pointsRequired
                                    ? "background: #10b981; border: none; color: white;"
                                    : "background: #e2e8f0; border: none; color: #94a3b8;"
                                }"><i class="bi bi-award-fill me-1"></i> แลก ${
                                  reward.pointsRequired
                                } แต้ม${cashText}</button></div></div>`;
                              })
                              .join("")}</div>`
                        )
                        .join("")
                    : '<div class="text-center p-5"><p class="text-muted fw-medium">ยังไม่มีของรางวัลในขณะนี้</p></div>'
                }</div></div></div></div><div class="col-lg-5 col-xl-4"><div id="tab-history" class="mobile-section"><div class="card border-0 rounded-4 shadow-sm h-100 bg-white"><div class="card-header bg-transparent border-0 pt-4 px-4 pb-0"><h5 class="fw-bold mb-0"><i class="bi bi-clock-history text-warning me-2"></i>ประวัติรายการ</h5></div><div class="card-body p-0 mt-3" style="max-height: 450px; overflow-y: auto;"><ul class="list-group list-group-flush px-3 pb-3">${
      user.pointsHistory.length > 0
        ? user.pointsHistory
            .map(
              (log) =>
                `<li class="list-group-item d-flex justify-content-between align-items-center px-2 py-3 border-bottom" style="border-color: #f1f5f9 !important;"><div><strong class="text-dark d-block mb-1" style="font-size: 0.9rem;">${
                  log.reason
                }</strong><small class="text-muted" style="font-size: 0.75rem;"><i class="bi bi-clock me-1"></i>${new Date(
                  log.timestamp
                ).toLocaleString("th-TH")}</small></div><span class="badge bg-${
                  log.pointsChange > 0 ? "success" : "danger"
                } bg-opacity-10 text-${
                  log.pointsChange > 0 ? "success" : "danger"
                } rounded-pill px-3 py-2 fs-6 fw-bold">${
                  log.pointsChange > 0 ? "+" : ""
                }${log.pointsChange}</span></li>`
            )
            .join("")
        : '<div class="text-center p-5"><span class="text-muted">ยังไม่มีประวัติการใช้งาน</span></div>'
    }</ul></div></div></div></div></div>
            </main>
        </div>
    `;

  const sidebarMenu = document.getElementById("sidebarMenu");
  const sidebarOverlay = document.getElementById("sidebarOverlay");
  const closeSidebar = () => {
    sidebarMenu.classList.remove("open");
    sidebarOverlay.classList.remove("show");
  };
  document.getElementById("burgerBtn").addEventListener("click", () => {
    sidebarMenu.classList.toggle("open");
    sidebarOverlay.classList.toggle("show");
  });
  document
    .getElementById("closeSidebarBtn")
    .addEventListener("click", closeSidebar);
  sidebarOverlay.addEventListener("click", closeSidebar);
  const doLogout = () => {
    localStorage.removeItem("loggedInUser");
    sessionStorage.removeItem("loggedInUser");
    window.location.href = "index.html";
  };
  if (document.getElementById("logoutBtnDesktop"))
    document
      .getElementById("logoutBtnDesktop")
      .addEventListener("click", doLogout);
  if (document.getElementById("menuMobileLogout"))
    document
      .getElementById("menuMobileLogout")
      .addEventListener("click", doLogout);

  document.querySelectorAll(".menu-item[data-target]").forEach((btn) => {
    btn.addEventListener("click", function () {
      document
        .querySelectorAll(".menu-item[data-target]")
        .forEach((b) => b.classList.remove("active"));
      this.classList.add("active");
      document
        .querySelectorAll(".mobile-section")
        .forEach((sec) => sec.classList.remove("active"));
      document
        .getElementById(this.getAttribute("data-target"))
        .classList.add("active");
      closeSidebar();
      window.scrollTo(0, 0);
    });
  });

  const openSettings = () => {
    Swal.fire({
      title: "ตั้งค่าบัญชีส่วนตัว",
      html: `<div class="text-start mt-3 p-3 bg-light rounded-4 border" style="border-color: #f1f5f9 !important;"><div class="mb-3"><label class="small text-muted fw-bold mb-1">ชื่อ-นามสกุล</label><div class="text-dark fs-6 bg-white p-2 px-3 rounded shadow-sm border" style="border-color: #e2e8f0 !important;">${
        user.firstName
      } ${
        user.lastName
      }</div></div><div class="mb-3"><label class="small text-muted fw-bold mb-1">เบอร์โทรศัพท์ (ใช้เข้าระบบ)</label><div class="text-dark fs-6 bg-white p-2 px-3 rounded shadow-sm border" style="border-color: #e2e8f0 !important;">${cleanPhone}</div><div class="text-danger small mt-2 fw-medium"><i class="bi bi-info-circle-fill me-1"></i>หากต้องการเปลี่ยนเบอร์มือถือ กรุณาติดต่อแอดมินคะ</div></div><div class="mb-2"><label class="small text-muted fw-bold mb-1">อีเมลติดต่อ</label><div class="d-flex justify-content-between align-items-center bg-white p-2 px-3 rounded shadow-sm border" style="border-color: #e2e8f0 !important;"><span class="text-dark fs-6 text-truncate pe-2">${
        user.email ||
        '<span class="text-warning small"><i class="bi bi-exclamation-triangle me-1"></i>ยังไม่ระบุ</span>'
      }</span><button id="swalEditEmailBtn" class="btn btn-sm btn-outline-primary rounded-pill px-3 fw-medium flex-shrink-0"><i class="bi bi-pencil me-1"></i>แก้ไข</button></div></div></div>`,
      showConfirmButton: false,
      showCloseButton: true,
      customClass: { popup: "rounded-4" },
      didOpen: () => {
        document
          .getElementById("swalEditEmailBtn")
          .addEventListener("click", () => {
            Swal.close();
            Swal.fire({
              title: "แก้ไขอีเมล",
              html: `<input id="swal-input-email" type="email" class="swal2-input bg-light border-0" placeholder="example@email.com" value="${
                user.email || ""
              }" style="border-radius:12px;"><input id="swal-input-pass" type="password" class="swal2-input bg-light border-0" placeholder="ใส่รหัสผ่านเพื่อยืนยัน" style="border-radius:12px;">`,
              showCancelButton: true,
              confirmButtonText: "บันทึก",
              cancelButtonText: "ยกเลิก",
              confirmButtonColor: "#4f46e5",
              customClass: { popup: "rounded-4" },
              preConfirm: () => [
                document.getElementById("swal-input-email").value,
                document.getElementById("swal-input-pass").value,
              ],
            }).then((res) => {
              if (res.value) {
                const [newEmail, pass] = res.value;
                if (!newEmail || !pass)
                  return Swal.fire(
                    "ข้อมูลไม่ครบ",
                    "กรุณากรอกข้อมูลให้ครบถ้วน",
                    "error"
                  );
                apiCall("updateEmail", {
                  phone: cleanPhone,
                  newEmail,
                  hashedPassword: hashPassword(pass),
                })
                  .then((data) =>
                    Swal.fire("สำเร็จ!", data.message, "success").then(() =>
                      location.reload()
                    )
                  )
                  .catch(console.error);
              }
            });
          });
      },
    });
  };
  if (document.getElementById("settingsBtnDesktop"))
    document
      .getElementById("settingsBtnDesktop")
      .addEventListener("click", openSettings);
  if (document.getElementById("menuMobileSettings"))
    document
      .getElementById("menuMobileSettings")
      .addEventListener("click", () => {
        closeSidebar();
        openSettings();
      });

  const openNotifications = () => {
    let nHtml = '<div class="text-start mt-2">';
    if (notifications.length === 0) {
      nHtml +=
        '<div class="text-center py-5"><p class="text-muted fw-medium">ไม่มีการแจ้งเตือนใหม่</p></div>';
    } else {
      nHtml +=
        '<ul class="list-group list-group-flush mb-4" style="max-height: 350px; overflow-y: auto;">';
      notifications.forEach((n) => {
        nHtml += `<li class="list-group-item px-1 py-3 border-bottom"><strong class="text-primary d-block mb-1" style="font-size:0.85rem;">${new Date(
          n.timestamp
        ).toLocaleDateString("th-TH")}</strong><span class="text-dark small">${
          n.message
        }</span></li>`;
      });
      nHtml += "</ul>";
    }
    nHtml += `<a href="https://line.me/R/ti/p/@732fqlwh" target="_blank" class="btn btn-success w-100 rounded-pill fw-bold shadow-sm py-2">ติดต่อแอดมิน</a></div>`;
    Swal.fire({
      title:
        '<h5 class="fw-bold mb-0 text-start" style="color:#1e293b;">การแจ้งเตือน</h5>',
      html: nHtml,
      width: 450,
      showConfirmButton: false,
      showCloseButton: true,
    });
  };
  document
    .getElementById("notificationBellBtn")
    .addEventListener("click", openNotifications);

  document.querySelectorAll(".redeem-btn").forEach((button) => {
    button.addEventListener("click", function () {
      const rewardId = this.dataset.rewardId;
      const rewardName = this.dataset.rewardName;
      Swal.fire({
        title: "ยืนยันการแลกรางวัล?",
        text: `คุณต้องการแลก "${rewardName}" ใช่หรือไม่?`,
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#10b981",
        confirmButtonText: "ยืนยันการแลก",
      }).then((result) => {
        if (result.isConfirmed) {
          apiCall("redeemReward", {
            memberPhone: cleanPhone,
            rewardId: rewardId,
          }).then(() => {
            Swal.fire(
              "สำเร็จ",
              "แลกของรางวัลสำเร็จ กรุณาแคปหน้าจอติดต่อแอดมิน",
              "success"
            ).then(() => location.reload());
          });
        }
      });
    });
  });
}

// === หน้า Admin ===
function handleAdminPage() {
  const rememberedUser =
    localStorage.getItem("loggedInUser") ||
    sessionStorage.getItem("loggedInUser");
  if (!rememberedUser) {
    window.location.href = "index.html";
    return;
  }
  const loggedInUser = JSON.parse(rememberedUser);
  if (!loggedInUser.isAdmin) {
    window.location.href = "index.html";
    return;
  }
  renderAdminPage(loggedInUser);
}

function renderAdminPage(adminUser) {
  const app = document.getElementById("app");
  app.innerHTML = `
        <div class="container-fluid py-4" style="max-width: 1200px; animation: slideUpFade 0.6s ease-out;">
            <header class="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-5 bg-white p-4 rounded-4 shadow-sm" style="border: 1px solid rgba(0,0,0,0.05);">
                <div class="mb-3 mb-md-0 d-flex align-items-center">
                    <div class="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center me-3" style="width: 50px; height: 50px; font-size: 1.5rem; background: linear-gradient(135deg, #4f46e5, #7c3aed) !important;"><i class="bi bi-shield-lock-fill"></i></div>
                    <div><h2 class="mb-0 fw-bold" style="color: #1e293b; font-size: 1.5rem;">ระบบจัดการหลังบ้าน</h2><p class="text-muted mb-0 small">ยินดีต้อนรับ: <span class="fw-semibold text-primary">${adminUser.firstName}</span></p></div>
                </div>
                <button id="logoutBtn" class="btn btn-outline-danger px-4 py-2 rounded-pill fw-medium"><i class="bi bi-box-arrow-right me-2"></i>ออกจากระบบ</button>
            </header>

            <div class="row g-4">
                <div class="col-lg-7">
                    <div class="card h-100 border-0 rounded-4 shadow-sm" style="background: #ffffff;">
                        <div class="card-header bg-transparent border-0 pt-4 pb-0 px-4"><h5 class="card-title fw-bold"><i class="bi bi-qr-code-scan text-primary me-2"></i>สแกนและจัดการลูกค้า</h5></div>
                        <div class="card-body p-4">
                            <div class="input-group mb-4 shadow-sm rounded-3 overflow-hidden" style="border: 1px solid #e2e8f0;">
                                <button class="btn btn-light border-0" type="button" id="scanBarcodeBtn" title="สแกน QR Code" style="color: #4f46e5; border-right: 1px solid #e2e8f0 !important;"><i class="bi bi-qr-code-scan fs-5 px-2"></i> สแกน</button>
                                <input type="text" id="searchPhone" class="form-control border-0 py-2" placeholder="คลิกสแกน หรือพิมพ์เบอร์โทรที่นี่..." autofocus>
                                <button class="btn btn-primary px-4 fw-medium" type="button" id="searchBtn" style="background: #4f46e5; border: none;">ค้นหา</button>
                            </div>
                            
                            <div id="customerActions" class="d-none">
                                <hr class="my-4 text-muted opacity-25">
                                <div id="customerDetails" class="p-4 mb-4 rounded-4" style="background: #f8fafc; border: 1px solid #e2e8f0;"></div>
                                
                                <div class="bg-white p-4 rounded-4 shadow-sm" style="border: 1px solid #e2e8f0;">
                                    <h6 class="fw-bold mb-3"><i class="bi bi-coin text-warning me-2"></i>จัดการแต้มสะสม</h6>
                                    <form id="pointsForm">
                                        <div class="row g-3">
                                            <div class="col-md-5"><label class="form-label small fw-medium text-muted">จำนวนแต้ม (+ หรือ -)</label><div class="input-group"><span class="input-group-text bg-light border-end-0"><i class="bi bi-plus-slash-minus"></i></span><input type="number" id="pointsChange" class="form-control border-start-0" placeholder="เช่น 20 หรือ -10" required></div></div>
                                            <div class="col-md-7"><label class="form-label small fw-medium text-muted">เหตุผล / หมายเหตุ</label><div class="input-group"><span class="input-group-text bg-light border-end-0"><i class="bi bi-chat-text"></i></span><input type="text" id="reason" class="form-control border-start-0" placeholder="เช่น ยอดซื้อ 400 บาท" required></div></div>
                                            <div class="col-12 mt-3"><label class="form-label small fw-medium text-muted"><i class="bi bi-image me-1"></i>แนบรูปภาพสลิป/หลักฐาน (ถ้ามี)</label><input type="file" id="pointsImage" class="form-control rounded-3" accept="image/*"></div>
                                        </div>
                                        <button type="submit" class="btn btn-success mt-4 w-100 py-2 rounded-3 fw-medium" style="background: #10b981; border: none;"><i class="bi bi-check2-circle me-2"></i>บันทึกข้อมูล</button>
                                    </form>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="col-lg-5">
                    <div class="card border-0 rounded-4 shadow-sm mb-4" style="background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);">
                        <div class="card-header bg-transparent border-0 pt-4 pb-0 px-4"><h5 class="card-title fw-bold"><i class="bi bi-send-fill text-info me-2"></i>ส่งการแจ้งเตือน</h5></div>
                        <div class="card-body p-4">
                            <form id="notificationForm" class="d-flex flex-column h-100">
                                <div class="mb-4"><label class="form-label small fw-medium text-muted">ข้อความ</label><textarea id="notificationMsg" class="form-control rounded-3" rows="3" placeholder="พิมพ์ข้อความแจ้งเตือน..." required style="resize: none;"></textarea></div>
                                <div class="mb-4"><label class="form-label small fw-medium text-muted">ส่งหาใคร (เบอร์โทร) <span class="text-info">*เว้นว่างเพื่อส่งทุกคน</span></label><div class="input-group"><span class="input-group-text bg-light border-end-0"><i class="bi bi-telephone"></i></span><input type="text" id="targetUser" class="form-control border-start-0" placeholder="08xxxxxxxx"></div></div>
                                <button type="submit" class="btn btn-info w-100 py-2 rounded-3 fw-bold text-white shadow-sm" style="background: linear-gradient(135deg, #0ea5e9, #3b82f6); border: none;"><i class="bi bi-send-check-fill me-2"></i>ส่งข้อความ</button>
                            </form>
                        </div>
                    </div>

                    <div class="card border-0 rounded-4 shadow-sm" style="background: #ffffff;">
                        <div class="card-header bg-transparent border-0 pt-4 pb-0 px-4"><h5 class="card-title fw-bold"><i class="bi bi-box-seam-fill text-warning me-2"></i>เพิ่มของรางวัล</h5></div>
                        <div class="card-body p-4">
                            <form id="addRewardForm">
                                <div class="mb-3"><label class="form-label small fw-medium text-muted">ชื่อของรางวัล</label><input type="text" id="rewardName" class="form-control rounded-3" required></div>
                                <div class="mb-3"><label class="form-label small fw-medium text-muted">รายละเอียด</label><textarea id="rewardDesc" class="form-control rounded-3" rows="2" required style="resize: none;"></textarea></div>
                                <div class="row g-3 mb-3">
                                    <div class="col-md-4"><label class="form-label small fw-medium text-muted">ใช้แต้ม</label><input type="number" id="rewardPoints" class="form-control rounded-3" required></div>
                                    <div class="col-md-4"><label class="form-label small fw-medium text-muted">ใช้เงินเพิ่ม</label><input type="number" id="rewardCash" class="form-control rounded-3" value="0" required></div>
                                    <div class="col-md-4">
                                        <label class="form-label small fw-medium text-muted">หมวดหมู่</label>
                                        <select id="rewardCategory" class="form-select rounded-3" required>
                                            <option value="" disabled selected>เลือก</option>
                                            <option value="ส่วนลด">ส่วนลด</option><option value="สินค้าพรีเมียม">สินค้าพรีเมียม</option><option value="แลกเงินสด">แลกเงินสด</option><option value="โปรประจำสัปดาห์">โปรประจำสัปดาห์</option><option value="เสริมประกัน">เสริมประกัน</option>
                                        </select>
                                    </div>
                                </div>
                                <div class="form-check mb-4 mt-2"><input class="form-check-input" type="checkbox" id="rewardIsNew" checked><label class="form-check-label small text-muted" for="rewardIsNew">แสดงป้าย <span class="badge bg-danger rounded-pill py-1 px-2 ms-1" style="font-size: 0.7rem;">ใหม่</span></label></div>
                                <button type="submit" class="btn btn-warning w-100 py-2 rounded-3 fw-bold text-dark shadow-sm" style="background: #f59e0b; border: none;"><i class="bi bi-plus-circle-fill me-2"></i>เพิ่มเข้าระบบ</button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

  document.getElementById("logoutBtn").addEventListener("click", () => {
    localStorage.removeItem("loggedInUser");
    sessionStorage.removeItem("loggedInUser");
    window.location.href = "index.html";
  });

  let currentCustomerPhone = null;
  const searchAction = () => {
    const phone = document.getElementById("searchPhone").value;
    if (!phone) return;
    const searchBtn = document.getElementById("searchBtn");
    const originalBtnText = searchBtn.innerHTML;
    searchBtn.innerHTML =
      '<span class="spinner-border spinner-border-sm"></span>';
    searchBtn.disabled = true;

    apiCall("searchUser", { phone })
      .then((user) => {
        const cleanAdminPhone = user.phone.replace(/'/g, "");
        currentCustomerPhone = cleanAdminPhone;

        let adminExpiryWarning = "";
        if (user.expiringPoints > 0) {
          adminExpiryWarning = `
                <div class="mt-3 bg-danger bg-opacity-10 border border-danger border-opacity-25 rounded-3 p-2 text-start d-inline-block shadow-sm">
                    <div class="text-danger small fw-bold mb-1"><i class="bi bi-exclamation-triangle-fill me-1"></i>แต้มจะหมดอายุ: ${user.expiringPoints} คะแนน</div>
                    <div class="text-muted" style="font-size: 0.7rem;">ภายใน ${user.expiryDate}</div>
                    <button id="notifyExpiryBtn" class="btn btn-sm btn-danger w-100 mt-2 fw-medium shadow-sm" style="font-size: 0.75rem;"><i class="bi bi-bell-fill me-1"></i>กดเพื่อส่งแจ้งเตือนให้ลูกค้า</button>
                </div>
            `;
        }

        document.getElementById("customerDetails").innerHTML = `
            <div class="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center">
                <div class="d-flex align-items-center mb-3 mb-sm-0">
                    <div class="bg-white rounded-circle d-flex align-items-center justify-content-center shadow-sm me-3" style="width: 50px; height: 50px; color: #4f46e5;"><i class="bi bi-person-fill fs-3"></i></div>
                    <div>
                        <h6 class="mb-1 fw-bold text-dark">${user.firstName} ${
          user.lastName
        }</h6>
                        <div class="d-flex align-items-center text-muted small">
                            <i class="bi bi-telephone-fill me-1"></i> <span id="displayPhone">${cleanAdminPhone}</span>
                            <button id="adminEditPhoneBtn" class="btn btn-sm btn-link p-0 ms-2 text-primary" title="แก้ไขเบอร์โทรและย้ายข้อมูล"><i class="bi bi-pencil-square"></i></button>
                        </div>
                    </div>
                </div>
                <div class="text-sm-end">
                    <span class="badge rounded-pill bg-${
                      user.accountStatus === "SUSPENDED" ? "danger" : "success"
                    } px-3 py-2 fw-medium">${
          user.accountStatus === "SUSPENDED" ? "บัญชีถูกระงับ" : "บัญชีปกติ"
        }</span>
                    <div class="mt-2 text-primary fw-bold"><i class="bi bi-star-fill text-warning me-1"></i>แต้มปัจจุบัน: <span class="fs-5">${
                      user.totalPoints
                    }</span></div>
                    ${adminExpiryWarning}
                </div>
            </div>
            <hr class="my-3 opacity-25">
            <div class="d-flex flex-wrap justify-content-between align-items-center">
                <div class="text-muted small d-flex align-items-center">
                    <strong>อีเมล:</strong> <span class="ms-1">${
                      user.email || "ไม่มีข้อมูล"
                    }</span>
                    <button id="adminEditEmailBtn" class="btn btn-sm btn-link p-0 ms-2 text-primary" title="แก้ไขอีเมล"><i class="bi bi-pencil-square"></i></button>
                </div>
                <div class="mt-2 mt-sm-0">
                    <button id="toggleStatusBtn" class="btn btn-sm btn-outline-${
                      user.accountStatus === "SUSPENDED" ? "success" : "danger"
                    } rounded-pill px-3 fw-medium">${
          user.accountStatus === "SUSPENDED"
            ? "เปิดใช้งานบัญชี"
            : "ระงับบัญชีชั่วคราว"
        }</button>
                </div>
            </div>
        `;
        document.getElementById("customerActions").classList.remove("d-none");

        const notifyBtn = document.getElementById("notifyExpiryBtn");
        if (notifyBtn) {
          notifyBtn.addEventListener("click", () => {
            Swal.fire({
              title: "ส่งแจ้งเตือนแต้มหมดอายุ?",
              text: `ระบบจะส่งข้อความเตือนไปยังกล่องแจ้งเตือนของลูกค้าเบอร์ ${cleanAdminPhone} ทันที`,
              icon: "question",
              showCancelButton: true,
              confirmButtonText: "ส่งข้อความ",
              cancelButtonText: "ยกเลิก",
              confirmButtonColor: "#dc3545",
            }).then((res) => {
              if (res.isConfirmed) {
                const msg = `📢 แจ้งเตือนจากร้านค้า: คุณมีแต้มสะสมจำนวน ${user.expiringPoints} คะแนน ที่กำลังจะหมดอายุในวันที่ ${user.expiryDate} นี้ อย่าลืมเข้ามาแลกของรางวัลกันนะคะ!`;
                apiCall("sendNotification", {
                  message: msg,
                  targetUser: cleanAdminPhone,
                  adminPhone: adminUser.phone,
                }).then(() => {
                  Swal.fire(
                    "สำเร็จ",
                    "ส่งแจ้งเตือนให้ลูกค้าเรียบร้อยแล้ว",
                    "success"
                  );
                });
              }
            });
          });
        }

        document
          .getElementById("adminEditPhoneBtn")
          .addEventListener("click", async () => {
            const { value: newPhone } = await Swal.fire({
              title: "แก้ไขเบอร์โทรศัพท์",
              input: "text",
              inputValue: cleanAdminPhone,
              html: '<p class="small text-danger"><b>คำเตือน:</b> การเปลี่ยนเบอร์ ระบบจะย้ายประวัติแต้มทั้งหมดไปที่เบอร์ใหม่ให้โดยอัตโนมัติ</p>',
              showCancelButton: true,
              confirmButtonText: "บันทึกการเปลี่ยนแปลง",
              confirmButtonColor: "#4f46e5",
              inputValidator: (val) => {
                if (!val) return "กรุณากรอกเบอร์โทรศัพท์ใหม่";
              },
            });
            if (newPhone && newPhone !== cleanAdminPhone) {
              apiCall("adminUpdatePhone", {
                oldPhone: cleanAdminPhone,
                newPhone: newPhone,
              }).then((res) => {
                Swal.fire("สำเร็จ", res.message, "success");
                document.getElementById("searchPhone").value = newPhone;
                searchAction();
              });
            }
          });

        document
          .getElementById("adminEditEmailBtn")
          .addEventListener("click", async () => {
            const { value: newEmail } = await Swal.fire({
              title: "แก้ไขอีเมลลูกค้า",
              input: "email",
              inputValue: user.email || "",
              showCancelButton: true,
              confirmButtonText: "บันทึก",
              confirmButtonColor: "#4f46e5",
            });
            if (newEmail) {
              apiCall("adminUpdateEmail", {
                memberPhone: cleanAdminPhone,
                newEmail,
              }).then((res) => {
                Swal.fire("สำเร็จ", res.message, "success");
                searchAction();
              });
            }
          });

        document
          .getElementById("toggleStatusBtn")
          .addEventListener("click", () => {
            const actionText =
              user.accountStatus === "SUSPENDED" ? "เปิดใช้งาน" : "ระงับ";
            Swal.fire({
              title: `ยืนยันการ${actionText}บัญชี?`,
              text: `แน่ใจหรือไม่ที่จะ${actionText}บัญชีลูกค้าเบอร์ ${cleanAdminPhone}?`,
              icon: "warning",
              showCancelButton: true,
              confirmButtonColor:
                user.accountStatus === "SUSPENDED" ? "#28a745" : "#d33",
              confirmButtonText: "ยืนยัน",
            }).then((res) => {
              if (res.isConfirmed)
                apiCall("toggleAccountStatus", {
                  memberPhone: cleanAdminPhone,
                }).then((data) => {
                  Swal.fire("สำเร็จ!", data.message, "success");
                  searchAction();
                });
            });
          });
      })
      .catch(() => {
        Swal.fire("ไม่พบข้อมูล", "ไม่พบเบอร์ลูกค้าในระบบ", "warning");
        document.getElementById("customerActions").classList.add("d-none");
        currentCustomerPhone = null;
      })
      .finally(() => {
        searchBtn.innerHTML = originalBtnText;
        searchBtn.disabled = false;
      });
  };

  document.getElementById("searchBtn").addEventListener("click", searchAction);
  document.getElementById("searchPhone").addEventListener("keypress", (e) => {
    if (e.key === "Enter") searchAction();
  });

  document.getElementById("scanBarcodeBtn").addEventListener("click", () => {
    if (typeof Html5QrcodeScanner === "undefined") {
      Swal.fire("ผิดพลาด", "ระบบสแกนยังโหลดไม่เสร็จ กรุณารอสักครู่", "error");
      return;
    }
    Swal.fire({
      title: '<h5 class="fw-bold mb-0">สแกน QR Code ลูกค้า</h5>',
      html: '<div id="qr-reader" style="width: 100%; border: none; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1);"></div><p class="text-muted small mt-3">ระบบจะเปิดกล้องเพื่อสแกนอัตโนมัติ หรือคลิก "Scan an Image File" เพื่ออัปโหลดรูปภาพ</p>',
      showConfirmButton: false,
      showCloseButton: true,
      allowOutsideClick: false,
      customClass: { popup: "rounded-4" },
      didOpen: () => {
        const html5QrcodeScanner = new Html5QrcodeScanner(
          "qr-reader",
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            supportedFormats: [Html5QrcodeSupportedFormats.QR_CODE],
          },
          false
        );
        html5QrcodeScanner.render(
          (decodedText) => {
            html5QrcodeScanner.clear();
            Swal.close();
            document.getElementById("searchPhone").value = decodedText;
            searchAction();
          },
          (errorMessage) => {}
        );
      },
      willClose: () => {
        try {
          if (document.getElementById("html5-qrcode-button-camera-stop"))
            document.getElementById("html5-qrcode-button-camera-stop").click();
        } catch (e) {}
      },
    });
  });

  document.getElementById("pointsForm").addEventListener("submit", (e) => {
    e.preventDefault();
    if (!currentCustomerPhone) {
      Swal.fire("ข้อผิดพลาด", "กรุณาค้นหาลูกค้าก่อน", "error");
      return;
    }

    const fileInput = document.getElementById("pointsImage");
    let imageBase64 = null;
    let imageMimeType = null;

    const processPoints = () => {
      apiCall("managePoints", {
        memberPhone: currentCustomerPhone,
        pointsChange: parseInt(
          document.getElementById("pointsChange").value,
          10
        ),
        reason: document.getElementById("reason").value,
        adminPhone: adminUser.phone,
        imageBase64: imageBase64,
        imageMimeType: imageMimeType,
      }).then(() => {
        Swal.fire("สำเร็จ", "ทำรายการแต้มและบันทึกรูปสำเร็จ", "success");
        document.getElementById("pointsForm").reset();
        searchAction();
      });
    };

    if (fileInput.files.length > 0) {
      showLoading("กำลังอัปโหลดรูปภาพและบันทึกแต้ม...");
      const file = fileInput.files[0];
      const reader = new FileReader();
      reader.onload = function (e) {
        imageBase64 = e.target.result;
        imageMimeType = file.type;
        processPoints();
      };
      reader.readAsDataURL(file);
    } else {
      processPoints();
    }
  });

  document
    .getElementById("notificationForm")
    .addEventListener("submit", (e) => {
      e.preventDefault();
      apiCall("sendNotification", {
        message: document.getElementById("notificationMsg").value,
        targetUser: document.getElementById("targetUser").value || null,
        adminPhone: adminUser.phone,
      }).then(() => {
        Swal.fire("สำเร็จ", "ส่งการแจ้งเตือนเรียบร้อย", "success");
        document.getElementById("notificationForm").reset();
      });
    });

  document.getElementById("addRewardForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const payload = {
      name: document.getElementById("rewardName").value,
      description: document.getElementById("rewardDesc").value,
      pointsRequired: parseInt(
        document.getElementById("rewardPoints").value,
        10
      ),
      cashRequired:
        parseInt(document.getElementById("rewardCash").value, 10) || 0,
      category: document.getElementById("rewardCategory").value,
      isNew: document.getElementById("rewardIsNew").checked,
      adminPhone: adminUser.phone,
    };
    apiCall("addReward", payload)
      .then(() => {
        Swal.fire(
          "สำเร็จ",
          "เพิ่มของรางวัลใหม่เข้าระบบเรียบร้อยแล้ว",
          "success"
        );
        document.getElementById("addRewardForm").reset();
      })
      .catch((err) => console.error(err));
  });
}
