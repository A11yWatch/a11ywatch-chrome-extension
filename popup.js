// let changeColor = document.getElementById('changeColor')
let scanPage = document.getElementById('scanPage')
let scanResults = document.getElementById('a11yScanResults')
let a11yIssues = document.getElementById('a11yIssues')

chrome.runtime.onMessage.addListener(function (details) {
  const dataParsed = JSON.parse(details.data)
  scanPage.innerHTML = "Scan"
  scanPage.disabled = false;

  if (dataParsed.error) {
    scanResults.innerHTML = `An Error Occured Please try again.`
    return
  }

  const issue = Array.isArray(dataParsed.issue) ? dataParsed.issue : []

  const issueList = issue
    .map((issue) => {
      return `
      <li class="a11y-issue-item">
        <div class="a11y-type">${issue.code}</div>
        <div class="a11y-message">${issue.message}</div>
        <code class="a11y-code">${issue.context}</code>
      </li>
    `
    })
    .join("")

  scanResults.innerHTML = `
  <style>
    .speed {
      color: ${dataParsed.pageLoadTime.color};
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
    <p>Duration is ${dataParsed.pageLoadTime.durationFormated} at <b class="speed">${dataParsed.pageLoadTime.duration}</b>ms</p>
    <h4>Info</h4>
    <div class="a11y-info-box">
      <div>Total issues found: ${dataParsed.issuesInfo.totalIssues}</div>
      <div>Total warnings: ${dataParsed.issuesInfo.warningCount}</div>
      <div>Total errors: ${dataParsed.issuesInfo.errorCount}</div>
      <div>Possible issues fixed by CDN: ${dataParsed.issuesInfo.possibleIssuesFixedByCdn}</div>
      <div>Skip Content link found: ${dataParsed.issuesInfo.issueMeta.skipContentIncluded ? "yes" : "no"}</div>
      <div>A11yWatch CDN connected: ${dataParsed.cdnConnected ? "yes" : "no"}</div>
      <div>Last scan date: ${dataParsed.lastScanDate}</div>
    </div>
    <ol id="a11yIssues">
    ${issueList}
    </ol>
  </div>`
})

// chrome.storage.sync.get('color', ({ color }) => {
//   scanPage.style.backgroundColor = color
// })

scanPage.addEventListener('click', async function (){
  this.innerHTML = "Loading..."
  this.disabled = true;

  let [tab] = await chrome.tabs.query({ active: true, currentWindow: true })

  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    function: getPageIssues,
  })
})

const getPageIssues = async () => {
  try {
    const response = await fetch(
      `https://api.a11ywatch.com/api/scanWebsiteAsync?websiteUrl=${encodeURI(
        location.href
      )}`,
      {
        method: 'POST',
      }
    )
    const data = await response.json()


    if (data.website) {
      const web = data.website
      const dataSource = JSON.stringify(Object.assign({}, web, { html: null }))
      chrome.runtime.sendMessage({ sendBack: true, data: dataSource })
    }
  } catch (e) {
    console.error(e)
    chrome.runtime.sendMessage({ sendBack: true, data: { error: e } })
  }
}
