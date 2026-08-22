document.addEventListener("DOMContentLoaded", () => {
  const state = {
    data: {},       // { fundId: [ {timestamp, date, category, amount, note}, ... ] }
    currentFund: null,
    txType: "deposit" // "deposit" | "withdraw"
  };

  const els = {
    viewHome: document.getElementById("view-home"),
    viewDetail: document.getElementById("view-detail"),
    fundList: document.getElementById("fund-list"),
    overviewTotal: document.getElementById("overview-total"),
    btnRefresh: document.getElementById("btn-refresh"),
    btnShareAll: document.getElementById("btn-share-all"),
    btnBack: document.getElementById("btn-back"),
    detailIcon: document.getElementById("detail-icon"),
    detailName: document.getElementById("detail-name"),
    detailBalance: document.getElementById("detail-balance"),
    btnDeposit: document.getElementById("btn-deposit"),
    btnWithdraw: document.getElementById("btn-withdraw"),
    btnShareFund: document.getElementById("btn-share-fund"),
    historyList: document.getElementById("history-list"),
    modalOverlay: document.getElementById("modal-overlay"),
    modalTitle: document.getElementById("modal-title"),
    btnCloseModal: document.getElementById("btn-close-modal"),
    btnCancel: document.getElementById("btn-cancel"),
    txForm: document.getElementById("tx-form"),
    txAmount: document.getElementById("tx-amount"),
    txDate: document.getElementById("tx-date"),
    txNote: document.getElementById("tx-note"),
    toast: document.getElementById("toast"),
    loadingOverlay: document.getElementById("loading-overlay")
  };

  document.title = CONFIG.appName;
  document.querySelector(".brand span").textContent = CONFIG.appName;

  // ---------- Helpers ----------
  function formatMoney(n) {
    const num = Number(n) || 0;
    return "฿" + num.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function formatDateThai(dateStr) {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    if (isNaN(d)) return dateStr;
    return d.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" });
  }

  function todayISO() {
    const d = new Date();
    const tz = d.getTimezoneOffset() * 60000;
    return new Date(d - tz).toISOString().slice(0, 10);
  }

  function showLoading() { els.loadingOverlay.classList.add("show"); }
  function hideLoading() { els.loadingOverlay.classList.remove("show"); }

  let toastTimer;
  function showToast(msg) {
    els.toast.textContent = msg;
    els.toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => els.toast.classList.remove("show"), 2600);
  }

  function fundConfig(id) {
    return CONFIG.funds.find(f => f.id === id) || { id, name: id, icon: "fa-wallet" };
  }

  function fundBalance(id) {
    const rows = state.data[id] || [];
    return rows.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
  }

  function fundLatest(id) {
    const rows = state.data[id] || [];
    if (!rows.length) return null;
    return [...rows].sort((a, b) => new Date(b.timestamp || b.date) - new Date(a.timestamp || a.date))[0];
  }

  // ---------- Data loading ----------
  async function loadData() {
    showLoading();
    try {
      const url = `${CONFIG.GAS_URL}?token=${encodeURIComponent(CONFIG.APP_SECRET)}`;
      const res = await fetch(url);
      const json = await res.json();
      if (json.status === "success") {
        state.data = json.data || {};
      } else {
        showToast(json.message || "โหลดข้อมูลไม่สำเร็จ");
      }
    } catch (err) {
      console.error(err);
      showToast("เชื่อมต่อฐานข้อมูลไม่ได้ ตรวจสอบ GAS_URL ใน config.js");
    } finally {
      hideLoading();
      renderHome();
      if (state.currentFund) renderDetail(state.currentFund);
    }
  }

  // ---------- Rendering ----------
  function renderHome() {
    const total = CONFIG.funds.reduce((sum, f) => sum + fundBalance(f.id), 0);
    els.overviewTotal.textContent = formatMoney(total);

    els.fundList.innerHTML = "";
    CONFIG.funds.forEach(f => {
      const balance = fundBalance(f.id);
      const latest = fundLatest(f.id);
      const card = document.createElement("div");
      card.className = "fund-card";
      card.innerHTML = `
        <div class="fund-icon"><i class="fa-solid ${f.icon}"></i></div>
        <div class="fund-info">
          <div class="fund-name">${f.name}</div>
          <div class="fund-sub">${latest ? "ล่าสุด " + formatDateThai(latest.date) : "ยังไม่มีรายการ"}</div>
        </div>
        <div class="fund-balance ${balance < 0 ? "negative" : ""}">${formatMoney(balance)}</div>
        <i class="fa-solid fa-chevron-right chevron"></i>
      `;
      card.addEventListener("click", () => openDetail(f.id));
      els.fundList.appendChild(card);
    });
  }

  function renderDetail(fundId) {
    const f = fundConfig(fundId);
    const balance = fundBalance(fundId);
    const rows = [...(state.data[fundId] || [])].sort(
      (a, b) => new Date(b.timestamp || b.date) - new Date(a.timestamp || a.date)
    );

    els.detailIcon.innerHTML = `<i class="fa-solid ${f.icon}"></i>`;
    els.detailName.textContent = f.name;
    els.detailBalance.textContent = formatMoney(balance);
    els.detailBalance.style.color = balance < 0 ? "var(--red)" : "";

    if (!rows.length) {
      els.historyList.innerHTML = `<p class="empty-state">ยังไม่มีรายการ</p>`;
      return;
    }

    els.historyList.innerHTML = rows.map(r => {
      const amt = Number(r.amount) || 0;
      const isIn = amt >= 0;
      return `
        <div class="history-item">
          <div class="hist-icon ${isIn ? "in" : "out"}">
            <i class="fa-solid ${isIn ? "fa-arrow-down" : "fa-arrow-up"}"></i>
          </div>
          <div class="hist-body">
            <div class="hist-note">${r.note ? escapeHtml(r.note) : (isIn ? "ฝากเงิน" : "ถอนเงิน")}</div>
            <div class="hist-date">${formatDateThai(r.date)}</div>
          </div>
          <div class="hist-amount ${isIn ? "in" : "out"}">${isIn ? "+" : "-"}${formatMoney(Math.abs(amt)).slice(1)}</div>
        </div>
      `;
    }).join("");
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  // ---------- Navigation ----------
  function openDetail(fundId) {
    state.currentFund = fundId;
    renderDetail(fundId);
    els.viewHome.classList.remove("active");
    els.viewDetail.classList.add("active");
    window.scrollTo(0, 0);
  }

  function backToHome() {
    state.currentFund = null;
    els.viewDetail.classList.remove("active");
    els.viewHome.classList.add("active");
    renderHome();
    window.scrollTo(0, 0);
  }

  els.btnBack.addEventListener("click", backToHome);
  els.btnRefresh.addEventListener("click", loadData);

  // ---------- Modal ----------
  function openModal(type) {
    state.txType = type;
    els.modalTitle.textContent = type === "deposit" ? "ฝากเงิน" : "ถอนเงิน";
    els.txForm.reset();
    els.txDate.value = todayISO();
    els.modalOverlay.classList.add("open");
    setTimeout(() => els.txAmount.focus(), 150);
  }

  function closeModal() {
    els.modalOverlay.classList.remove("open");
  }

  els.btnDeposit.addEventListener("click", () => openModal("deposit"));
  els.btnWithdraw.addEventListener("click", () => openModal("withdraw"));
  els.btnCloseModal.addEventListener("click", closeModal);
  els.btnCancel.addEventListener("click", closeModal);
  els.modalOverlay.addEventListener("click", (e) => {
    if (e.target === els.modalOverlay) closeModal();
  });

  els.txForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const rawAmount = Math.abs(parseFloat(els.txAmount.value) || 0);
    if (rawAmount <= 0) {
      showToast("กรุณากรอกจำนวนเงินให้ถูกต้อง");
      return;
    }
    const amount = state.txType === "deposit" ? rawAmount : -rawAmount;

    const payload = {
      token: CONFIG.APP_SECRET,
      fund: state.currentFund,
      date: els.txDate.value || todayISO(),
      amount: amount,
      note: els.txNote.value.trim()
    };

    closeModal();
    showLoading();
    try {
      const res = await fetch(CONFIG.GAS_URL, {
        method: "POST",
        body: JSON.stringify(payload)
      });
      const json = await res.json().catch(() => ({ status: "success" }));
      if (json.status === "error") {
        showToast(json.message || "บันทึกไม่สำเร็จ");
      } else {
        showToast(state.txType === "deposit" ? "ฝากเงินสำเร็จ" : "ถอนเงินสำเร็จ");
      }
    } catch (err) {
      console.error(err);
      showToast("บันทึกไม่สำเร็จ ตรวจสอบการเชื่อมต่อ");
    } finally {
      await loadData();
    }
  });

  // ---------- LINE Share ----------
  function shareToLine(text) {
    const url = `https://line.me/R/msg/text/?${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  }

  els.btnShareAll.addEventListener("click", () => {
    const total = CONFIG.funds.reduce((sum, f) => sum + fundBalance(f.id), 0);
    let text = `💰 ${CONFIG.appName}\nสรุปยอดคงเหลือ\n\n`;
    CONFIG.funds.forEach(f => {
      text += `• ${f.name}: ${formatMoney(fundBalance(f.id))}\n`;
    });
    text += `\nรวมทั้งหมด: ${formatMoney(total)}`;
    shareToLine(text);
  });

  els.btnShareFund.addEventListener("click", () => {
    const f = fundConfig(state.currentFund);
    const balance = fundBalance(state.currentFund);
    const latest = fundLatest(state.currentFund);
    let text = `💰 ${f.name}\nยอดคงเหลือ: ${formatMoney(balance)}`;
    if (latest) {
      const amt = Number(latest.amount) || 0;
      text += `\nรายการล่าสุด: ${amt >= 0 ? "ฝาก" : "ถอน"} ${formatMoney(Math.abs(amt))} (${formatDateThai(latest.date)})`;
      if (latest.note) text += `\nหมายเหตุ: ${latest.note}`;
    }
    text += `\n\n#${CONFIG.appName}`;
    shareToLine(text);
  });

  // ---------- Init ----------
  loadData();
});
