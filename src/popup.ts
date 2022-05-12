let scanPage = document.getElementById("scanPage") as HTMLButtonElement;
let scanResults = document.getElementById("a11yScanResults");
let a11yIssues = document.getElementById("a11yIssues");
// api key
let tokenInput = document.getElementById("a11yToken") as HTMLInputElement;
let tokenSubmit = document.getElementById(
  "a11yTokenSubmit"
) as HTMLButtonElement;

type Issue = {
  code: string;
  message: string;
  context: string;
};

// gather the details for the report
chrome.runtime.onMessage.addListener(function (details) {
  const dataParsed = details && JSON.parse(details.data);
  scanPage.innerHTML = "Scan";
  scanPage.disabled = false;

  if (!dataParsed) {
    return;
  }

  if (scanResults && dataParsed.error) {
    scanResults.innerHTML =
      dataParsed.error || `An Error Occured Please try again.`;
    return;
  }

  const issue = Array.isArray(dataParsed?.issue) ? dataParsed.issue : [];

  const issueList = issue
    .map((issue: Issue) => {
      return `
      <li class="a11y-issue-item">
        <div class="a11y-type">${issue.code}</div>
        <div class="a11y-message">${issue.message}</div>
        <code class="a11y-code">${issue.context}</code>
      </li>
    `;
    })
    .join("");

  if (scanResults) {
    const pageLoadTime = dataParsed?.pageLoadTime ?? {
      duration: 0,
      durationFormated: "0ms",
      color: "#276749",
    };

    const issuesinfo = dataParsed?.issuesInfo ?? {
      totalIssues: 0,
      warningCount: 0,
      errorCount: 0,
      possibleIssuesFixedByCdn: 0,
      issueMeta: {
        skipContentIncluded: false,
      },
    };

    scanResults.innerHTML = `
      <style>
        .speed {
          color: ${pageLoadTime?.color};
        }
        .a11y-info-box {
          background: #ccc;
          padding: 8px;
          border-radius: 3px;
        }
        .a11y-score {
          font-size: 1.2em;
          font-weight: 600;
        }
        .a11y-type {
          font-weight: 500;
        }
        .a11y-message {
          font-weight: 400;
        }
        .a11y-code {
          font-weight: 200;
        }
        .a11y-results-panel {
          padding: 22px;
        }
      </style>
      <div class="a11y-results-panel">
        <h2>Results: ${dataParsed.url}</h2>
        <h3>Accessibility Score</h3>
        <p class="a11y-score">${dataParsed.adaScore}</p>
        <h4>Page Speed</h4>
        <p>Duration is ${pageLoadTime?.durationFormated} at <b class="speed">${
      pageLoadTime?.duration
    }</b>ms</p>
        <h4>Info</h4>
        <div class="a11y-info-box">
          <div>Total issues found: ${issuesinfo?.totalIssues}</div>
          <div>Total warnings: ${issuesinfo?.warningCount}</div>
          <div>Total errors: ${issuesinfo?.errorCount}</div>
          <div>Possible issues fixed by CDN: ${
            issuesinfo?.possibleIssuesFixedByCdn
          }</div>
          <div>Skip Content link found: ${
            issuesinfo?.issueMeta?.skipContentIncluded ? "yes" : "no"
          }</div>
          <div>A11yWatch CDN connected: ${
            dataParsed.cdnConnected ? "yes" : "no"
          }</div>
          <div>Last scan date: ${dataParsed.lastScanDate}</div>
        </div>
        <ol id="a11yIssues">
        ${issueList}
        </ol>
      </div>`;
  }
});

const defaultError = (e?: string) => {
  chrome.runtime.sendMessage({
    sendBack: true,
    data: {
      error:
        e ||
        "API key error. Please add your api key or wait for your limits to reset. Check the A11yWatch API page for more details.",
    },
  });
};

function getPageIssues() {
  chrome.storage.sync.get("jwt", ({ jwt }) => {
    fetch("https://api.a11ywatch.com/api/scan-simple", {
      method: "POST",
      headers: {
        Authorization: jwt,
        websiteUrl: location.href,
      },
    })
      .then((response) => {
        if (response?.ok) {
          response?.json().then((res: any) => {
            const { data } = res;
            if (data) {
              chrome.runtime.sendMessage({
                sendBack: true,
                data: JSON.stringify(data),
              });
            } else {
              defaultError();
            }
          });
        } else {
          defaultError();
        }
      })
      .catch((e) => {
        defaultError(e);
      });
  });
}

chrome.storage.sync.get("jwt", ({ jwt }) => {
  if (jwt) {
    tokenInput.value = jwt;
  }
});

tokenSubmit.addEventListener("click", function () {
  const jwt = tokenInput?.value;
  if (jwt) {
    chrome.storage.sync.set({ jwt: jwt.trim() });
  } else {
    alert("Please enter your API token from http://a11ywatch.com");
  }
});

scanPage.addEventListener("click", async function () {
  this.innerHTML = "Loading...";
  this.disabled = true;

  chrome.tabs
    .query({ active: true, currentWindow: true })
    .then(([tab]) => {
      chrome.scripting
        .executeScript({
          target: { tabId: tab?.id || 0 },
          func: getPageIssues,
        })
        .then()
        .catch((e) => {
          console.error(e);
        });
    })
    .catch((e) => {
      console.error(e);
    });
});
