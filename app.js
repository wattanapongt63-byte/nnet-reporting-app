document.addEventListener("DOMContentLoaded", () => {
    // 1. Initialize from CONFIG
    document.getElementById("app-subtitle").textContent = `${CONFIG.reportTitle} ครั้งที่ ${CONFIG.semester} ปีการศึกษา ${CONFIG.year}`;
    document.getElementById("report-doc-title").textContent = CONFIG.reportTitle;
    document.getElementById("report-doc-subtitle").textContent = `ครั้งที่ ${CONFIG.semester} ปีการศึกษา ${CONFIG.year}`;

    // Populate District Select
    const districtSelect = document.getElementById("district-select");
    const examCenterInput = document.getElementById("exam-center");

    for (const district in CONFIG.districtMapping) {
        const option = document.createElement("option");
        option.value = district;
        option.textContent = district;
        districtSelect.appendChild(option);
    }

    // 2. Handle District Change
    districtSelect.addEventListener("change", (e) => {
        const selectedDistrict = e.target.value;
        if (selectedDistrict && CONFIG.districtMapping[selectedDistrict]) {
            examCenterInput.value = CONFIG.districtMapping[selectedDistrict];
        } else {
            examCenterInput.value = "";
        }
    });

    // 3. Auto Calculate Absences
    const levels = ['primary', 'lower-sec', 'upper-sec'];
    
    levels.forEach(level => {
        const eligibleInput = document.getElementById(`${level}-eligible`);
        const attendedInput = document.getElementById(`${level}-attended`);
        const absentBox = document.getElementById(`${level}-absent`);

        const calcAbsent = () => {
            const eligible = parseInt(eligibleInput.value) || 0;
            let attended = parseInt(attendedInput.value) || 0;
            
            // Validation
            if (attended > eligible) {
                attendedInput.value = eligible;
                attended = eligible;
            }

            const absent = eligible - attended;
            absentBox.textContent = absent;
        };

        eligibleInput.addEventListener("input", calcAbsent);
        attendedInput.addEventListener("input", calcAbsent);
    });

    // 4. Tab Navigation and Dashboard Update
    const form = document.getElementById("report-form");
    const formSection = document.getElementById("form-section");
    const dashboardSection = document.getElementById("dashboard-section");
    
    const tabForm = document.getElementById("tab-form");
    const tabDashboard = document.getElementById("tab-dashboard");

    function showLoading() {
        document.getElementById("loading-overlay").style.display = "flex";
    }

    function hideLoading() {
        document.getElementById("loading-overlay").style.display = "none";
    }

    async function updateDashboardData() {
        const localData = {
            reporter: document.getElementById("reporter-name").value || "-",
            position: document.getElementById("reporter-position").value || "-",
            district: document.getElementById("district-select").value || "-",
            center: document.getElementById("exam-center").value || "-"
        };

        showLoading();
        try {
            const response = await fetch(CONFIG.GAS_URL);
            const resData = await response.json();
            
            let gasData = [];
            if (resData.status === "success") {
                gasData = resData.data;
            }
            populateDashboard(localData, gasData);
        } catch (error) {
            console.error("Error fetching data:", error);
            // alert("ไม่สามารถดึงข้อมูลจากฐานข้อมูลได้ จะแสดงเพียงข้อมูลที่คุณเพิ่งกรอก");
            // If failed, just show empty
            populateDashboard(localData, []);
        } finally {
            hideLoading();
        }
    }

    tabForm.addEventListener("click", () => {
        tabForm.classList.add("active");
        tabDashboard.classList.remove("active");
        formSection.style.display = "block";
        dashboardSection.style.display = "none";
    });

    tabDashboard.addEventListener("click", () => {
        tabDashboard.classList.add("active");
        tabForm.classList.remove("active");
        formSection.style.display = "none";
        dashboardSection.style.display = "block";
        updateDashboardData();
    });

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        
        const data = {
            reporter: document.getElementById("reporter-name").value,
            position: document.getElementById("reporter-position").value,
            district: document.getElementById("district-select").value,
            center: document.getElementById("exam-center").value,
            levels: {
                primary: {
                    eligible: parseInt(document.getElementById("primary-eligible").value) || 0,
                    attended: parseInt(document.getElementById("primary-attended").value) || 0,
                },
                lowerSec: {
                    eligible: parseInt(document.getElementById("lower-sec-eligible").value) || 0,
                    attended: parseInt(document.getElementById("lower-sec-attended").value) || 0,
                },
                upperSec: {
                    eligible: parseInt(document.getElementById("upper-sec-eligible").value) || 0,
                    attended: parseInt(document.getElementById("upper-sec-attended").value) || 0,
                }
            }
        };

        showLoading();
        try {
            await fetch(CONFIG.GAS_URL, {
                method: "POST",
                body: JSON.stringify(data)
            });
            tabDashboard.click();
            window.scrollTo(0, 0);
        } catch (error) {
            console.error("Error posting data:", error);
            alert("เกิดข้อผิดพลาดในการบันทึกข้อมูล (หรืออาจติดเรื่อง CORS)");
            tabDashboard.click(); // Proceed anyway for offline fallback
        } finally {
            hideLoading();
        }
    });

    // 6. Populate Dashboard
    function populateDashboard(localData, gasData) {
        // Info
        document.getElementById("dash-reporter").textContent = localData.reporter;
        document.getElementById("dash-position").textContent = localData.position;
        document.getElementById("dash-district").textContent = localData.district;
        document.getElementById("dash-center").textContent = localData.center;

        // Update Title to show District prominently
        document.getElementById("report-doc-district").textContent = `ประจำ สกร.ระดับอำเภอ${localData.district}`;

        document.getElementById("sig-reporter-name").textContent = `(${localData.reporter})`;
        document.getElementById("sig-reporter-position").textContent = localData.position;

        const tbody = document.getElementById("dashboard-table-body");
        tbody.innerHTML = "";

        let grandTotPriEli = 0, grandTotPriAtt = 0, grandTotPriAbs = 0;
        let grandTotLowEli = 0, grandTotLowAtt = 0, grandTotLowAbs = 0;
        let grandTotUppEli = 0, grandTotUppAtt = 0, grandTotUppAbs = 0;
        let grandTotAll = 0;

        let index = 1;
        for (const dist in CONFIG.districtMapping) {
            const centerName = CONFIG.districtMapping[dist];
            let pEli = 0, pAtt = 0, pAbs = 0;
            let lEli = 0, lAtt = 0, lAbs = 0;
            let uEli = 0, uAtt = 0, uAbs = 0;

            const distData = gasData.find(row => row.district === dist);

            if (distData) {
                pEli = distData.levels.primary.eligible || 0;
                pAtt = distData.levels.primary.attended || 0;
                pAbs = pEli - pAtt;

                lEli = distData.levels.lowerSec.eligible || 0;
                lAtt = distData.levels.lowerSec.attended || 0;
                lAbs = lEli - lAtt;

                uEli = distData.levels.upperSec.eligible || 0;
                uAtt = distData.levels.upperSec.attended || 0;
                uAbs = uEli - uAtt;
            }

            const totalForRow = pEli + lEli + uEli;

            const rowHtml = `
                <tr>
                    <td>${index++}</td>
                    <td style="text-align: left;">${dist}</td>
                    <td style="text-align: left;">${centerName}</td>
                    <td>${pEli || '-'}</td><td>${pAtt || '-'}</td><td class="text-danger">${pAbs || '-'}</td>
                    <td>${lEli || '-'}</td><td>${lAtt || '-'}</td><td class="text-danger">${lAbs || '-'}</td>
                    <td>${uEli || '-'}</td><td>${uAtt || '-'}</td><td class="text-danger">${uAbs || '-'}</td>
                    <td class="fw-bold">${totalForRow || '-'}</td>
                </tr>
            `;
            tbody.innerHTML += rowHtml;

            grandTotPriEli += pEli; grandTotPriAtt += pAtt; grandTotPriAbs += pAbs;
            grandTotLowEli += lEli; grandTotLowAtt += lAtt; grandTotLowAbs += lAbs;
            grandTotUppEli += uEli; grandTotUppAtt += uAtt; grandTotUppAbs += uAbs;
            grandTotAll += totalForRow;
        }

        // Grand Totals Table
        document.getElementById("tbl-tot-pri-eli").textContent = grandTotPriEli || '-';
        document.getElementById("tbl-tot-pri-att").textContent = grandTotPriAtt || '-';
        document.getElementById("tbl-tot-pri-abs").textContent = grandTotPriAbs || '-';

        document.getElementById("tbl-tot-low-eli").textContent = grandTotLowEli || '-';
        document.getElementById("tbl-tot-low-att").textContent = grandTotLowAtt || '-';
        document.getElementById("tbl-tot-low-abs").textContent = grandTotLowAbs || '-';

        document.getElementById("tbl-tot-upp-eli").textContent = grandTotUppEli || '-';
        document.getElementById("tbl-tot-upp-att").textContent = grandTotUppAtt || '-';
        document.getElementById("tbl-tot-upp-abs").textContent = grandTotUppAbs || '-';

        document.getElementById("tbl-tot-grand").textContent = grandTotAll || '-';

        // Cards (Sum of all levels)
        const totEli = grandTotPriEli + grandTotLowEli + grandTotUppEli;
        const totAtt = grandTotPriAtt + grandTotLowAtt + grandTotUppAtt;
        const totAbs = grandTotPriAbs + grandTotLowAbs + grandTotUppAbs;
        
        const totAttPct = totEli > 0 ? ((totAtt / totEli) * 100).toFixed(2) : "0.00";
        const totAbsPct = totEli > 0 ? ((totAbs / totEli) * 100).toFixed(2) : "0.00";

        document.getElementById("stat-total-eligible").textContent = totEli;
        document.getElementById("stat-total-attended").textContent = totAtt;
        document.getElementById("stat-attended-pct").textContent = `(${totAttPct}%)`;
        document.getElementById("stat-total-absent").textContent = totAbs;
        document.getElementById("stat-absent-pct").textContent = `(${totAbsPct}%)`;
    }

    // 7. Export PDF
    document.getElementById("btn-export-pdf").addEventListener("click", () => {
        const element = document.getElementById("report-content");
        const district = document.getElementById("dash-district").textContent;
        const opt = {
            margin:       10,
            filename:     `รายงานN-NET_สกร_${district}.pdf`,
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2, useCORS: true },
            jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        // Add loading state
        const btn = document.getElementById("btn-export-pdf");
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> กำลังสร้าง...';
        btn.disabled = true;

        html2pdf().set(opt).from(element).save().then(() => {
            btn.innerHTML = originalText;
            btn.disabled = false;
        });
    });

    // 8. Export Excel
    document.getElementById("btn-export-excel").addEventListener("click", () => {
        // Collect data into an array of arrays
        const district = document.getElementById("dash-district").textContent;
        const center = document.getElementById("dash-center").textContent;
        
        const wb = XLSX.utils.book_new();
        
        // Title Rows
        const ws_data = [
            [`${CONFIG.reportTitle} ครั้งที่ ${CONFIG.semester} ปีการศึกษา ${CONFIG.year}`],
            [`ในสังกัดสำนักงานส่งเสริมการเรียนรู้ประจำจังหวัดมหาสารคาม`],
            [],
            [`ผู้รายงาน:`, document.getElementById("dash-reporter").textContent, `ตำแหน่ง:`, document.getElementById("dash-position").textContent],
            [`สกร.ระดับอำเภอ:`, district, `สนามสอบ:`, center],
            [],
            ["ที่", "สกร.ระดับอำเภอ", "สนามสอบ", "ประถม (สิทธิ์)", "ประถม (มา)", "ประถม (ขาด)", "ม.ต้น (สิทธิ์)", "ม.ต้น (มา)", "ม.ต้น (ขาด)", "ม.ปลาย (สิทธิ์)", "ม.ปลาย (มา)", "ม.ปลาย (ขาด)", "รวมทั้งสิ้น"]
        ];

        const tbody = document.getElementById("dashboard-table-body");
        const rows = tbody.querySelectorAll("tr");
        rows.forEach(tr => {
            const cells = Array.from(tr.querySelectorAll("td")).map(td => td.textContent === '-' ? '' : td.textContent);
            ws_data.push(cells);
        });

        // Add total row
        ws_data.push([
            "", "รวมทั้งสิ้น", "",
            document.getElementById("tbl-tot-pri-eli").textContent,
            document.getElementById("tbl-tot-pri-att").textContent,
            document.getElementById("tbl-tot-pri-abs").textContent,
            document.getElementById("tbl-tot-low-eli").textContent,
            document.getElementById("tbl-tot-low-att").textContent,
            document.getElementById("tbl-tot-low-abs").textContent,
            document.getElementById("tbl-tot-upp-eli").textContent,
            document.getElementById("tbl-tot-upp-att").textContent,
            document.getElementById("tbl-tot-upp-abs").textContent,
            document.getElementById("tbl-tot-grand").textContent
        ].map(val => val === '-' ? '' : val));

        const ws = XLSX.utils.aoa_to_sheet(ws_data);
        XLSX.utils.book_append_sheet(wb, ws, "รายงาน N-NET");

        XLSX.writeFile(wb, `รายงานN-NET_สกร_${district}.xlsx`);
    });
});
