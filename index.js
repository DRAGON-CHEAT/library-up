import file1 from './library/categories.json';
import file2 from './library/games.json';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // =========================================================
    // 1. مسار الحسابات والاشتراكات الجديد (/account)
    // =========================================================
    if (url.pathname === "/account") {
      if (request.method === "OPTIONS") {
        return new Response(null, {
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type"
          }
        });
      }

      try {
        const body = await request.json();
        const { device_key, username, nonce, action } = body;

        if (!device_key || !nonce) {
          return jsonResponse({ status: "error", msg: "Missing fields" }, 400);
        }

        const repo = env.GITHUB_REPO || "DRAGON-CHEAT/library-up";
        const branch = env.GITHUB_BRANCH || "main";
        const apiUrl = `https://github.com{repo}/contents/accounts.json?ref=${branch}`;

        const ghRes = await fetch(apiUrl, {
          headers: {
            "Authorization": `Bearer ${env.GITHUB_TOKEN}`,
            "User-Agent": "DRCH-PSP-Worker",
            "Accept": "application/vnd.github.v3+json"
          }
        });

        if (!ghRes.ok) {
          return jsonResponse({ status: "error", msg: "GitHub read failed" }, 500);
        }

        const ghData = await ghRes.json();
        const contentStr = decodeURIComponent(escape(atob(ghData.content.replace(/\n/g, ""))));
        let accounts = JSON.parse(contentStr || "{}");
        let needSave = false;

        const today = new Date().toISOString().split("T")[0];

        if (action === "register" && username) {
          const cleanUser = username.trim().toLowerCase();

          for (const [k, v] of Object.entries(accounts)) {
            if (k !== device_key && v.username && v.username.toLowerCase() === cleanUser) {
              return jsonResponse({ status: "username_taken", msg: "Username already exists" });
            }
          }

          if (!accounts[device_key]) {
            accounts[device_key] = {
              username: username.trim(),
              sends: 1,
              created: today,
              expires: ""
            };
            needSave = true;
          } else {
            if ((accounts[device_key].sends || 0) >= 2) {
              return jsonResponse({ status: "max_sends", msg: "Maximum sends reached" });
            }
            accounts[device_key].username = username.trim();
            accounts[device_key].sends = (accounts[device_key].sends || 0) + 1;
            needSave = true;
          }
        }

        if (needSave) {
          const updatedBase64 = btoa(unescape(encodeURIComponent(JSON.stringify(accounts, null, 2))));
          const putRes = await fetch(`https://github.com{repo}/contents/accounts.json`, {
            method: "PUT",
            headers: {
              "Authorization": `Bearer ${env.GITHUB_TOKEN}`,
              "User-Agent": "DRCH-PSP-Worker",
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              message: `Update account ${device_key.slice(0, 6)}`,
              content: updatedBase64,
              sha: ghData.sha,
              branch: branch
            })
          });

          if (!putRes.ok) {
            return jsonResponse({ status: "error", msg: "GitHub write failed" }, 500);
          }
        }

        const userRecord = accounts[device_key];
        let state = "unregistered";
        let retUser = "";
        let retExpires = "";

        if (userRecord) {
          retUser = userRecord.username || "";
          retExpires = userRecord.expires || "";

          if (!retExpires) {
            state = "waiting";
          } else if (retExpires >= today) {
            state = "active";
          } else {
            state = "expired";
          }
        }

        const secret = env.SIGN_SECRET || "DRCH_M33_SECRET_2026";
        const signature = await signData(`${device_key}:${state}:${retExpires}:${nonce}:${secret}`);

        return jsonResponse({
          status: state,
          username: retUser,
          expires: retExpires,
          sig: signature
        });

      } catch (e) {
        return jsonResponse({ status: "error", msg: e.message }, 500);
      }
    }

    // =========================================================
    // 2. مكتبة الألعاب والتصنيفات الأصلية (كما هي تماماً)
    // =========================================================
    const combinedData = {
      ...file1,
      ...file2
    };

    return new Response(JSON.stringify(combinedData, null, 2), {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
};

function jsonResponse(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*"
    }
  });
}

async function signData(text) {
  const enc = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");
}
