/**
 * Script for GitHub Actions to manually check SonarCloud Quality Gate status
 * by polling the SonarCloud API. This avoids using problematic third-party actions.
 */

// WARNING: Project Key must match the value defined in ci-cd.yml's SonarQube Scan step.
const PROJECT_KEY = 'zeemezeeyou_devsecops-solution'; 
const MAX_WAIT_TIME_SECONDS = 300; // 5 นาที (Maximum wait time)
const POLLING_INTERVAL_SECONDS = 5; // (Polling interval)

/**
 * Sleeps for a given duration.
 * @param {number} ms - Milliseconds to sleep.
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Checks the Quality Gate status via Sonar API.
 * @param {object} context - GitHub Action context object (contains core, fetch).
 */
async function checkQualityGate({core, fetch}) {
    // 1. ดึงค่าจาก Environment Variables (ที่กำหนดไว้ใน env block ของ ci-cd.yml)
    const SONAR_HOST = process.env.SONAR_HOST_URL;
    const SONAR_TOKEN = process.env.SONAR_TOKEN;
    
    // ตรวจสอบว่ามี Token และ Host URL
    if (!SONAR_TOKEN) {
        // ใช้ core.setFailed เพื่อให้ Job ล้มเหลวทันทีหากไม่พบ
        core.setFailed("SONAR_TOKEN is missing from environment variables. Please check the 'env' block in ci-cd.yml.");
        return;
    }
    
    // การเข้ารหัส Token สำหรับ HTTP Basic Auth (Token เป็น username, รหัสผ่านว่างเปล่า)
    const authHeader = `Basic ${Buffer.from(SONAR_TOKEN + ':').toString('base64')}`;

    let taskAnalysisId;
    let qualityGateStatus = 'NONE';
    const startTime = Date.now();

    core.info(`Starting check for Sonar Quality Gate on project: ${PROJECT_KEY}`);
    core.info(`Host URL: ${SONAR_HOST}`);

    // === 2. หา Task Analysis ID ล่าสุด ===
    let totalWaitTime = 0;
    while (!taskAnalysisId && totalWaitTime < MAX_WAIT_TIME_SECONDS) {
        // API endpoint สำหรับค้นหา analysis ล่าสุด
        const statusUrl = `${SONAR_HOST}/api/project_analyses/search?project=${PROJECT_KEY}&pageSize=1`;
        
        core.info(`Attempting to fetch latest analysis... (Wait time: ${totalWaitTime}s)`);
        
        try {
            const response = await fetch(statusUrl, {
                headers: { 'Authorization': authHeader }
            });

            if (!response.ok) {
                // ถ้าดึงข้อมูลไม่ได้ ให้รอและลองใหม่ (หรืออาจ Fail ถ้าสถานะเป็น 404/403)
                core.warning(`Warning: Failed to fetch analysis status (${response.status}): ${response.statusText}. Retrying...`);
                await sleep(POLLING_INTERVAL_SECONDS * 1000);
                totalWaitTime += POLLING_INTERVAL_SECONDS;
                continue;
            }

            const data = await response.json();

            if (data.analyses && data.analyses.length > 0) {
                // ดึง Key ของการวิเคราะห์ล่าสุด
                taskAnalysisId = data.analyses[0].key;
                core.info(`Found latest analysis key: ${taskAnalysisId}`);
                break;
            }
        } catch (error) {
            core.warning(`Warning: API call failed - ${error.message}. Retrying...`);
        }

        await sleep(POLLING_INTERVAL_SECONDS * 1000);
        totalWaitTime += POLLING_INTERVAL_SECONDS;
    }

    if (!taskAnalysisId) {
        core.setFailed("Could not find any recent Sonar analysis key after maximum wait time.");
        return;
    }

    // === 3. ตรวจสอบ Quality Gate Status ด้วย Analysis ID ที่ได้ ===
    totalWaitTime = 0;
    while (qualityGateStatus === 'NONE' && totalWaitTime < MAX_WAIT_TIME_SECONDS) {
        // API endpoint สำหรับตรวจสอบสถานะ Quality Gate
        const qualityGateUrl = `${SONAR_HOST}/api/qualitygates/project_status?analysisId=${taskAnalysisId}`;

        core.info(`Checking Quality Gate status for analysis ID: ${taskAnalysisId} (Total wait: ${totalWaitTime}s)`);

        try {
            const response = await fetch(qualityGateUrl, {
                headers: { 'Authorization': authHeader }
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch Quality Gate status: ${response.statusText}`);
            }

            const data = await response.json();
            
            if (data.projectStatus && data.projectStatus.status) {
                qualityGateStatus = data.projectStatus.status;
                
                if (qualityGateStatus !== 'OK') {
                    // ถ้า FAIL หรือ ERROR ให้ Job ล้มเหลว
                    core.setFailed(`❌ Sonar Quality Gate FAILED with status: ${qualityGateStatus}`);
                } else {
                    core.info("✅ Sonar Quality Gate PASSED.");
                }
                return;
            }
        } catch (error) {
            core.warning(`Warning: Quality Gate API call failed - ${error.message}. Retrying...`);
        }

        await sleep(POLLING_INTERVAL_SECONDS * 1000);
        totalWaitTime += POLLING_INTERVALS_SECONDS;
    }

    if (qualityGateStatus === 'NONE') {
        core.setFailed("Sonar Quality Gate status not available after maximum wait time. Analysis may be stuck.");
    }
}

module.exports = { checkQualityGate };
