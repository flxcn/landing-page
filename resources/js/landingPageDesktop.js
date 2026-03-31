async function detectAdBlock() {
    let adBlockEnabled = false
    const googleAdUrl = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js'
    try {
        await fetch(new Request(googleAdUrl)).catch(_ => adBlockEnabled = true)
    } catch (e) {
        adBlockEnabled = true;
    } finally {
        return adBlockEnabled;
    }
}

async function detectDdgExtension() {
    const EXTENSION_IDS = [
        'bkdgflcldnnnapblkhphbgpggdiikppg', // Chrome Web Store
        'caoacbimdbbljakfhgikoodekdnlcgpk', // Microsoft Edge Add-ons store
    ];

    const results = await Promise.all(
        EXTENSION_IDS.map(id =>
            fetch(`chrome-extension://${id}/img/logo-small.svg`)
                .then(res => res.ok)
                .catch(() => false)
        )
    );

    return results.some(Boolean);
}

const millisecondsPerDay = 1000 * 3600 * 24;

const scanWindowMilliseconds = 1 * 60 * 1000;  // 1 minute cap for searching for uncertain SERP origin page visits

let historyDataEntered = false;

let outputData = {};

const changedDefault = (new URLSearchParams(window.location.search)).get('CHANGED_DEFAULT');
const prolificId = (new URLSearchParams(window.location.search)).get("PROLIFIC_PID");
const studyPhase = (new URLSearchParams(window.location.search)).get("STUDY_PHASE");
const treatmentCondition = parseInt((new URLSearchParams(window.location.search)).get("TC"), 10);

const queryKeys = new Set(["q", "query", "p", "wd", "word", "oq"]);

let changedDefaultKey = changedDefault;
if (changedDefaultKey == "Ask.com") {
    changedDefaultKey = "Ask";
} else if (changedDefaultKey == "Yahoo!") {
    changedDefaultKey = "Yahoo";
}

window.addEventListener('pageshow', function (event) {
    document.getElementById('fileInput').value = '';
});

document.getElementById('continueButton').onclick = () => {
    document.getElementById('infoSection').style.display = 'none';
    document.getElementById('formSection').style.display = 'block';
};

document.getElementById('submitButton').onclick = async (event) => {
    event.target.classList.add("is-loading");
    document.getElementById('submit-error').classList.remove("is-active");

    const url = "https://q5mrwzyq1e.execute-api.us-east-2.amazonaws.com/deployed";

    const postBodyJson = {
        prolificId: prolificId,
        studyPhase: studyPhase,
        treatmentCondition: treatmentCondition,
        historyData: outputData,
    }

    await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(postBodyJson)
    })
        .then(response => {
            if (response.ok) {
                return response.json()
            } else {
                throw new Error();
            }
        })
        .then(data => {
            if (data.statusCode == 200) {
                if (studyPhase == "initial") {
                    window.location.href = `https://princetonsurvey.az1.qualtrics.com/jfe/form/SV_23rpQ1POFvbm7RQ?PROLIFIC_PID=${prolificId}`;
                } else {
                    window.location.href = `https://princetonsurvey.az1.qualtrics.com/jfe/form/SV_4Zrmc8ungMIoDyK?PROLIFIC_PID=${prolificId}`;
                }
            } else {
                throw new Error();
            }
        }).catch(() => {
            document.getElementById('submit-error').classList.add("is-active");
        });

    event.target.classList.remove("is-loading");
};

document.getElementById("copyExtensionUrlButton").onclick = () => {
    navigator.clipboard.writeText(document.getElementById('extensionUrlTextField').value);
    document.getElementById('tooltip').innerHTML = 'Copied!';
};

document.getElementById("copyExtensionUrlButton").onmouseout = () => {
    document.getElementById('tooltip').innerHTML = 'Copy to clipboard';
};

const searchEnginesMetadata = {
    Google: {
        getIsSerpPage: function (url) {
            return url.match(/(?:^(?:https?):\/\/(?:www\.)?google\.com(?::[0-9]+)?\/search(?:\/\?|\?))/i);
        },
        searchQueryParameters: ["q", "query"],
    },
    DuckDuckGo: {
        getIsSerpPage: function (url) {
            if (url.match(/(?:^(?:https?):\/\/(?:www\.)?duckduckgo\.com)/i)) {
                return !!new URL(url).searchParams.get("q");
            }
            return false;
        },
        searchQueryParameters: ["q"],
    },
    Bing: {
        getIsSerpPage: function (url) {
            return !!url.match(/(?:^(?:https?):\/\/(?:www\.)?bing\.com(?::[0-9]+)?\/search(?:\/\?|\?))/i);
        },
        searchQueryParameters: ["q"],
    },
    Yahoo: {
        getIsSerpPage: function (url) {
            return !!url.match(/(?:^(?:https?):\/\/(?:www\.)?search\.yahoo\.com(?::[0-9]+)?\/search(?:\/\?|\?|\/;_ylt|;_ylt))/i);
        },
        searchQueryParameters: ["p", "q", "query"],
    },
    Ecosia: {
        getIsSerpPage: function (url) {
            return !!url.match(/(?:^(?:https?):\/\/(?:www\.)?ecosia\.org(?::[0-9]+)?\/search(?:\/\?|\?))/i);
        },
        searchQueryParameters: ["q"],
    },
    Ask: {
        getIsSerpPage: function (url) {
            return !!url.match(/(?:^(?:https?):\/\/(?:www\.)?ask\.com(?::[0-9]+)?\/web(?:\/\?|\?))/i);
        },
        searchQueryParameters: ["q", "query"],
    },
    Baidu: {
        getIsSerpPage: function (url) {
            return url.match(/(?:^(?:https?):\/\/(?:www\.)?baidu\.com(?::[0-9]+)?\/s(?:\/\?|\?))/i);
        },
        searchQueryParameters: ["wd", "word"],
    },
    Brave: {
        getIsSerpPage: function (url) {
            return !!url.match(/(?:^(?:https?):\/\/(?:www\.)?search\.brave\.com(?::[0-9]+)?\/search(?:\/\?|\?))/i);
        },
        searchQueryParameters: ["q"],
    },
}

const onlineServiceDictionary = {
    // E-commerce
    "Amazon": { "hostname": "amazon.com" },
    "Apple": { "hostname": "apple.com" },
    "Best Buy": { "hostname": "bestbuy.com" },
    "Costco": { "hostname": "costco.com" },
    "eBay": { "hostname": "ebay.com" },
    "Etsy": { "hostname": "etsy.com" },
    "Google Shopping 1": { "hostname": "google.com", "path": "shopping" },
    "Google Shopping 2": { "hostname": "google.com", "path": "search", "queryParam": { "key": "udm", "value": "28" } },
    "Home Depot": { "hostname": "homedepot.com" },
    "Kroger": { "hostname": "kroger.com" },
    "Lowes": { "hostname": "lowes.com" },
    "Target": { "hostname": "target.com" },
    "Walmart": { "hostname": "walmart.com" },
    "Wayfair": { "hostname": "wayfair.com" },

    // Generative AI Services
    "ChatGPT": { "hostname": "chatgpt.com" },
    "Claude": { "hostname": "claude.ai" },
    "Google Gemini": { "hostname": "gemini.google.com" },
    "Grok": { "hostname": "grok.com" },
    "Microsoft Copilot": { "hostname": "copilot.microsoft.com" },
    "Perplexity AI": { "hostname": "perplexity.ai" },

    // Music Lyrics
    "AZLyrics": { "hostname": "azlyrics.com" },
    "Genius": { "hostname": "genius.com" },
    "Lyrics.com": { "hostname": "lyrics.com" },
    "Musixmatch": { "hostname": "musixmatch.com" },
    "SongLyrics": { "hostname": "songlyrics.com" },

    // Restaurant and Business Recommendations
    "Google Maps": { "hostname": "google.com", "path": "maps" },
    "Yelp": { "hostname": "yelp.com" },

    // Airlines
    "Alaska": { "hostname": "alaskaair.com" },
    "Allegiant": { "hostname": "allegiantair.com" },
    "American": { "hostname": "aa.com" },
    "Delta": { "hostname": "delta.com" },
    "Frontier": { "hostname": "flyfrontier.com" },
    "Hawaiian": { "hostname": "hawaiianairlines.com" },
    "Jet Blue": { "hostname": "jetblue.com" },
    "Southwest": { "hostname": "southwest.com" },
    "Spirit": { "hostname": "spirit.com" },
    "United": { "hostname": "united.com" },

    // Hotels 
    "Hilton": { "hostname": "hilton.com" },
    "Hyatt": { "hostname": "hyatt.com" },
    "IHG": { "hostname": "ihg.com" },
    "Marriott": { "hostname": "marriott.com" },
    "Wyndham": { "hostname": "wyndhamhotels.com" },

    // Online Travel Agencies and Search Services
    "Agoda": { "hostname": "agoda.com" },
    "Booking.com": { "hostname": "booking.com" },
    "Choice Hotels": { "hostname": "choicehotels.com" },
    "Expedia": { "hostname": "expedia.com" },
    "Google Travel": { "hostname": "google.com", "path": "travel" },
    "Hotels.com": { "hostname": "hotels.com" },
    "Hotwire": { "hostname": "hotwire.com" },
    "Kayak": { "hostname": "kayak.com" },
    "Orbitz": { "hostname": "orbitz.com" },
    "Priceline": { "hostname": "priceline.com" },
    "Skyscanner": { "hostname": "skyscanner.com" },
    "Travelocity": { "hostname": "travelocity.com" },
    "Tripadvisor": { "hostname": "tripadvisor.com" },
    "Trivago": { "hostname": "trivago.com" },

    // Weather
    "AccuWeather": { "hostname": "accuweather.com" },
    "National Weather Service": { "hostname": "weather.gov" },
    "The Weather Channel": { "hostname": "weather.com" },
    "WeatherBug": { "hostname": "weatherbug.com" },
    "Weather Underground": { "hostname": "wunderground.com" },
    "Windy": { "hostname": "windy.com" },
};

function getServiceFromParsedUrl(parsedUrl) {
    try {
        if (!parsedUrl) return null;

        // Normalize hostname
        const hostname = parsedUrl.hostname.toLowerCase().replace(/^www\./, '');
        const pathname = parsedUrl.pathname.toLowerCase();

        for (const [serviceName, serviceData] of Object.entries(onlineServiceDictionary)) {
            // Hostname match (allow subdomains)
            if (hostname != serviceData.hostname && !hostname.endsWith('.' + serviceData.hostname)) continue;
            if (serviceData.path) {
                // Extract first path segment
                const firstSegment = pathname.split("/").filter(Boolean)[0] || "";
                if (firstSegment != serviceData.path) continue;
            }
            if (serviceData.queryParam) {
                if (parsedUrl.searchParams.get(serviceData.queryParam.key) != serviceData.queryParam.value) continue;
            }
            return serviceName;
        }
        return null;
    } catch (err) {
        return null;
    }
}

function getSerpQueryFromParsedUrl(parsedUrl, engine) {
    try {
        if (!parsedUrl || !engine) return null;

        // Get the possible search query parameters for the engine.
        const searchQueryParameters = searchEnginesMetadata[engine].searchQueryParameters;

        // If any of the search query parameters are in the URL, return the query.
        for (const parameter of searchQueryParameters) {
            const query = parsedUrl.searchParams.get(parameter);
            if (query) return query;
        }

        // For DuckDuckGo, the search parameter can be specified in the pathname.
        // eg. https://duckduckgo.com/Example?ia=web
        if (engine == "DuckDuckGo") {
            const pathnameSplit = parsedUrl.pathname.split("/");
            if (pathnameSplit.length == 2 && pathnameSplit[1]) {
                const query = decodeURIComponent(pathnameSplit[1].replace(/_/g, " "));
                if (query) return query;
            }
        }
        return "";
    } catch (error) {
        return null;
    }
}

const COMMON_PUBLIC_SUFFIXES = new Set([
    "co.uk", "com.au", "co.in", "com.br", "com.sg", "co.jp", "com.mx", "com.tr"
]);

function getBaseDomain(hostname) {
    // hostname like "www.google.com" -> "google.com"
    // handles common multi-part suffixes like co.uk -> "bbc.co.uk"
    const parts = (hostname || "").toLowerCase().split(".").filter(Boolean);
    if (parts.length <= 2) return parts.join(".");
    const last2 = parts.slice(-2).join(".");
    const last3 = parts.slice(-3).join(".");
    // If the last two labels form a known public suffix (e.g., "co.uk"),
    // the registrable domain is last3, else last2.
    if (COMMON_PUBLIC_SUFFIXES.has(last2)) return last3;
    return last2;
}

document.getElementById('fileInput').addEventListener('change', async event => {
    try {
        const file = event.target.files[0];
        document.getElementById("fileName").innerHTML = file.name;

        document.getElementById("file-error-message").classList.remove("is-active");
        document.getElementById("file-error-message-special").classList.remove("is-active");
        document.getElementById("fileInputDiv").classList.remove("is-danger");

        const historyArray = JSON.parse(
            await file.text()
        ).sort((a, b) => b.visitTime - a.visitTime);

        const adBlockPromise = detectAdBlock();

        const now = Date.now();

        // In the initial phase, reject if less than 10 days of history
        if (studyPhase == "initial") {
            const newestLocal = historyArray.find(item => item.isLocal == true);
            const oldestLocal = historyArray.findLast(item => item.isLocal == true);
            const daysBetweenFirstAndLastHistoryItem = (newestLocal && oldestLocal)
                ? (newestLocal.visitTime - oldestLocal.visitTime) / millisecondsPerDay
                : 0;
            if (daysBetweenFirstAndLastHistoryItem < 10) {
                window.location.href = "https://app.prolific.com/submissions/complete?cc=C1OIROZ1";
                return;
            }
        }

        // Check if the participant conducted the test of their changed default.
        if (studyPhase == "initial" && ((treatmentCondition >= 2 && treatmentCondition <= 6))) {
            const filteredHistoryForCheckingTest = historyArray.filter((historyItem) =>
                ((now - historyItem.visitTime) / (1000 * 60) <= 10) &&
                (searchEnginesMetadata[changedDefaultKey].getIsSerpPage(historyItem.url)) &&
                (historyItem.transition == "generated") && (historyItem.isLocal == true)
            );

            const meetsHistoryRequirement = treatmentCondition == 6
                ? filteredHistoryForCheckingTest.length >= 2 &&
                (Math.max(...filteredHistoryForCheckingTest.map(i => i.visitTime)) -
                    Math.min(...filteredHistoryForCheckingTest.map(i => i.visitTime))) >= 500 &&
                await detectDdgExtension()
                : filteredHistoryForCheckingTest.length >= 1;

            if (!meetsHistoryRequirement) {
                historyDataEntered = false;
                document.getElementById('submitButton').disabled = true;

                if (treatmentCondition == 6) {
                    const userAgent = navigator.userAgent;
                    let ddgInstallLink = "";
                    if ((/edg/i).test(userAgent)) {
                        ddgInstallLink = "https://microsoftedge.microsoft.com/addons/detail/duckduckgo-search-track/caoacbimdbbljakfhgikoodekdnlcgpk";
                    } else {
                        ddgInstallLink = "https://chromewebstore.google.com/detail/duckduckgo-search-tracker/bkdgflcldnnnapblkhphbgpggdiikppg";
                    }
                    document.getElementById("file-error-message-special").innerHTML = `We were not able to confirm that you have installed and activated the DuckDuckGo Search & Tracker Protection web browser extension. Please run two different web searches in a new tab using your web browser's address bar. You may use any search queries that you choose. These searches should run with DuckDuckGo. If either of the searches runs with a search engine that is different from DuckDuckGo, please ensure that the DuckDuckGo Privacy Essentials extension is installed and activated. You can install the extension by clicking <a href="${ddgInstallLink}" target="_blank">here</a>. After installation, return to your web browser's settings, confirm that the extension is toggled on, and then run another two searches from the address bar. Once complete, repeat the steps above to generate an updated JSON file and upload the newly generated file.`
                } else {
                    document.getElementById("file-error-message-special").innerText = `We were not able to confirm that you have tried out ${changedDefault}. Please run a web search in a new tab using your web browser's address bar. You may use any search query that you choose. This search should run with ${changedDefault}. If your search still runs with a search engine that is different from ${changedDefault}, please return to your web browser's settings, confirm that the default search engine is set to ${changedDefault}, and then in a new tab run another search from your web browser's address bar. Once complete, repeat the steps above to generate an updated JSON file and upload the newly generated file.`
                }

                document.getElementById("file-error-message-special").classList.add("is-active");
                document.getElementById("fileInputDiv").classList.add("is-danger");
                document.getElementById('dataVisual').innerHTML = ""
                return;
            }
        }

        if (studyPhase != "initial") {
            const daysSinceMostRecentHistoryEntry = (now - historyArray[0].visitTime) / millisecondsPerDay;
            if (daysSinceMostRecentHistoryEntry > 2) {
                historyDataEntered = false;
                document.getElementById('submitButton').disabled = true;

                document.getElementById("file-error-message-special").innerText = "It appears you are attempting to upload a version of the history.json file that you downloaded previously. Please ensure you are submitting the most recent version of the history.json file, which you just downloaded."
                document.getElementById("file-error-message-special").classList.add("is-active");
                document.getElementById("fileInputDiv").classList.add("is-danger");
                document.getElementById('dataVisual').innerHTML = ""
                return;
            }
        }

        const cutoffTime = now - 30 * millisecondsPerDay;
        const cutoffIndex = historyArray.findIndex(item => item.visitTime < cutoffTime);
        const filteredHistoryForPeriod = (cutoffIndex == -1 ? historyArray : historyArray.slice(0, cutoffIndex))
            .map(item => {
                try {
                    const parsedUrl = new URL(item.url);
                    const searchEngine = Object.entries(searchEnginesMetadata)
                        .find(([_, engine]) => engine.getIsSerpPage(item.url))?.[0] ?? null;
                    return { ...item, parsedUrl, baseDomain: getBaseDomain(parsedUrl.hostname), searchEngine };
                } catch {
                    return { ...item, parsedUrl: null, baseDomain: "", searchEngine: null };
                }
            });

        const allVisitIds = new Set();
        const childrenByReferrer = new Map();
        for (const item of filteredHistoryForPeriod) {
            if (item.visitId) allVisitIds.add(item.visitId);
            if (!item.referringVisitId || item.referringVisitId == "0") continue;
            if (!childrenByReferrer.has(item.referringVisitId)) {
                childrenByReferrer.set(item.referringVisitId, []);
            }
            childrenByReferrer.get(item.referringVisitId).push(item);
        }

        const searchUseData = [];
        const queryToIdMap = new Map();
        let nextQueryId = 0;

        // Dict to convert visitCount to which visit a history entry is for a URL.
        // If a URL was visited 3 times, the visitCount is 3 for all instances.
        const realVisitCounts = {};

        for (let i = 0; i < filteredHistoryForPeriod.length; i++) {
            const historyItem = filteredHistoryForPeriod[i];

            const { searchEngine } = historyItem;
            if (!searchEngine) continue;

            let queryId = -1;
            const query = getSerpQueryFromParsedUrl(historyItem.parsedUrl, searchEngine);
            try {
                if (query != null) {
                    const lowerCaseQuery = query.toLowerCase();
                    if (!queryToIdMap.has(lowerCaseQuery)) {
                        queryToIdMap.set(lowerCaseQuery, nextQueryId++);
                    }
                    queryId = queryToIdMap.get(lowerCaseQuery);
                }
            } catch (error) {
                queryId = -1;
            }

            const queryParameters = (() => {
                try {
                    const result = [];
                    for (const [key, value] of historyItem.parsedUrl.searchParams.entries()) {
                        if (value == query || queryKeys.has(key)) {
                            result.push([key, "search-study-hidden"]);
                        } else {
                            result.push([key, value]);
                        }
                    }
                    return result;
                } catch {
                    return [];
                }
            })();

            if (!(historyItem.url in realVisitCounts)) {
                realVisitCounts[historyItem.url] = historyItem.visitCount;
            }

            const previousSearchCount = (() => {
                try {
                    if (historyItem.transition != "reload") {
                        realVisitCounts[historyItem.url] -= 1;
                    }
                    return realVisitCounts[historyItem.url];
                } catch {
                    return -1;
                }
            })();

            let nextWebpageVisitTime = null;
            // history is newest -> oldest, so walk backward in the array
            for (let j = i - 1; j >= 0; j--) {
                const nextItem = filteredHistoryForPeriod[j];
                if ((nextItem.isLocal == historyItem.isLocal) &&
                    (nextItem.baseDomain) &&
                    (nextItem.baseDomain != historyItem.baseDomain)) {
                    nextWebpageVisitTime = nextItem.visitTime;
                    break;
                }
            }

            const certainMatches = historyItem.visitId
                ? (childrenByReferrer.get(historyItem.visitId) ?? [])
                    .filter(child => child.baseDomain != historyItem.baseDomain && child.isLocal == historyItem.isLocal)
                    .map(child => ({ timestamp: child.visitTime, certain: true }))
                : [];

            const uncertainCandidate = (() => {
                for (let j = i - 1; j >= 0; j--) {
                    if (filteredHistoryForPeriod[j].isLocal == historyItem.isLocal) {
                        return filteredHistoryForPeriod[j];
                    }
                }
                return null;
            })();

            const uncertainMatch = (
                uncertainCandidate &&
                uncertainCandidate.visitTime - historyItem.visitTime <= scanWindowMilliseconds &&
                uncertainCandidate.searchEngine == null &&
                uncertainCandidate.baseDomain != historyItem.baseDomain &&
                uncertainCandidate.transition == 'link' &&
                (uncertainCandidate.referringVisitId == "0" || !allVisitIds.has(uncertainCandidate.referringVisitId))
            ) ? { timestamp: uncertainCandidate.visitTime, certain: false } : null;

            const serpOriginPageVisits = [
                ...certainMatches,
                ...(uncertainMatch ? [uncertainMatch] : []),
            ];

            searchUseData.push({
                searchEngine,
                timestamp: historyItem.visitTime,
                transition: historyItem.transition,
                queryId,
                previousSearchCount,
                queryParameters,
                isLocal: historyItem.isLocal,
                serpOriginPageVisits,
                nextWebpageVisitTime,
            });
        }

        const browserUseDataBuckets = Array.from({ length: 30 }, () => ({
            count: 0,
            noFragment: new Set(),
            noQuery: new Set(),
            baseDomains: new Set(),
            absDomains: new Set(),
        }));

        for (let i = 0; i < filteredHistoryForPeriod.length; i++) {
            const item = filteredHistoryForPeriod[i];
            if (item.isLocal == false) continue;

            const daysBack = Math.floor((now - item.visitTime) / millisecondsPerDay);
            if (daysBack < 0 || daysBack >= 30) continue;

            const b = browserUseDataBuckets[daysBack];
            b.count++;
            b.noFragment.add(item.url.split("#")[0]);
            b.noQuery.add(item.url.split("?")[0].split("#")[0]);
            if (!!item.baseDomain) b.baseDomains.add(item.baseDomain);
            if (!!item.parsedUrl) b.absDomains.add(item.parsedUrl.hostname);
        }

        const browserUseData = browserUseDataBuckets.map((b, daysBack) => ({
            numDaysBack: daysBack,
            numWebpages: b.count,
            numUniqueWebpagesWithoutFragmentIdentifiers: b.noFragment.size,
            numUniqueWebpagesWithoutQueryParameters: b.noQuery.size,
            numUniqueDomains: b.baseDomains.size,
            numUniqueAbsoluteDomains: b.absDomains.size,
        }));

        const onlineServiceUseData = filteredHistoryForPeriod
            .map(historyItem => {
                const serviceName = getServiceFromParsedUrl(historyItem.parsedUrl);
                if (!serviceName) return null;
                return {
                    serviceName,
                    timestamp: historyItem.visitTime,
                    transition: historyItem.transition,
                    isLocal: historyItem.isLocal,
                };
            })
            .filter(Boolean);

        const ddgExtensionData = {
            hasDdgExtension: await detectDdgExtension(),
            ddgUninstallVisitTimes: filteredHistoryForPeriod
                .filter(historyItem => {
                    if (historyItem.isLocal) return false;
                    try {
                        const url = historyItem.parsedUrl;
                        if (!url) return false;
                        return url.hostname == 'www.surveymonkey.com' &&
                            url.searchParams.has('browser') &&
                            url.searchParams.has('v') &&
                            url.searchParams.has('install');
                    } catch { return false; }
                })
                .map(historyItem => historyItem.visitTime),
        };

        outputData = {
            currentTime: now,
            timezoneOffset: new Date().getTimezoneOffset(),
            searchUseData,
            browserUseData,
            onlineServiceUseData,
            ddgExtensionData,
            hasAdBlock: await adBlockPromise,
        };

        document.getElementById('dataVisual').innerHTML = JSON.stringify(outputData, null, 2);

        historyDataEntered = true;
    }
    catch (error) {
        historyDataEntered = false;
        document.getElementById("file-error-message").classList.add("is-active");
        document.getElementById("fileInputDiv").classList.add("is-danger");
        document.getElementById('dataVisual').innerHTML = ""
    }

    if (historyDataEntered) {
        document.getElementById('submitButton').disabled = false;
    } else {
        document.getElementById('submitButton').disabled = true;
    }
});
