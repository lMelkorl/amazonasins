document.addEventListener("DOMContentLoaded", function () {
    const extractButton = document.getElementById("extractButton");
    const urlsList = document.getElementById("urlsList");
    const urlsCount = document.getElementById("urlsCount");
    const countElement = document.getElementById("count");
    const api = "http://localhost:5000/api/";

    let requestCount = 0; // İstek sayacı
    const openedTabs = []; // Açılan tabları takip etmek için dizi
    let openTabs = []; // Aktif sekme bilgilerini tutmak için dizi

    let intervalId; // setInterval işlevinden dönen aralık kimliği
    // A2W8EY4J0UOJZR

    let newCodes;
    let newMagazaId;
    let newTotalCount;
    let newStartTime;
    let newEndTime;

    extractButton.addEventListener("click", async () => {
        urlsList.innerHTML = "";
        countElement.textContent = "Yükleniyor...";
        requestCount = 0; // İstek sayacını sıfırla
        openedTabs.length = 0; // Açılan tabları temizle
        openTabs = await chrome.tabs.query({}); // Aktif sekmeleri al

        let urls = [];

        try {
            const response = await fetch(`${api}magazadurum0`);
            const data = await response.json();

            urls = data.magazalar.map((res) => ({
                amazonUrl: res.amazonUrl,
                magazaId: res.magazaid,
            }));
        } catch (error) {
            console.log("İstek sırasında hata oluştu:", error);
        }

        let currentIndex = 0; // Şu an işlenen mağazanın dizideki indeksi



        const processedUrls = []; // İşlenen URL'leri takip etmek için bir dizi oluştur

        async function processMagaza(url, magazaId) {
            const openedTabUrls = openTabs.map((tab) => tab.url);

            if (processedUrls.includes(url)) {
                console.log("Bu URL zaten işlenmiş ve güncelleniyor:", url);
                const urlIndex = processedUrls.indexOf(url);
                processedUrls.splice(urlIndex, 1); // İşlenen URL'yi listeden kaldır
                return; // URL'yi tekrar işlememek için fonksiyondan çık
            }

            // Check if the URL is already opened
            if (openedTabUrls.includes(url)) {
                console.log("Bu URL zaten bir tabda açık:", url);
                return; // Aynı URL'yi tekrar açmamak için fonksiyondan çık
            }

            processedUrls.push(url); // İşlenen URL'leri `processedUrls` dizisine ekle

            // Yeni bir tab aç ve URL'yi yükle
            const tab = await chrome.tabs.create({ url: url, active: false });

            // İşlemler devam ederken yeni bir sekme açıldığında veya mevcut sekme güncellendiğinde işlem tamamlanmamış olacağından, işleme devam etmeden önce tabloya ekleyelim.
            openTabs.push(tab);

            const listener = async function (tabId, changeInfo) {
                if (tabId === tab.id && changeInfo.status === "complete") {
                    chrome.tabs.onUpdated.removeListener(listener);
                    console.log("Yeni sekme açıldı:", url);

                    // Başlık kontrolü
                    const tabInfo = await chrome.tabs.get(tabId);
                    if (tabInfo.title === "Amazon.ca Something Went Wrong / Quelque chose s'est mal passé") {
                        console.log("Engellendi: Something Went Wrong sayfası");
                        chrome.tabs.remove(tabId)
                        processNextMagaza(); // İşlem tamamlandığında, diğer mağazayı işleyebilmek için döngüyü tekrar çağırın
                        return;
                    }

                    const maxPage = await getMaxPage(tab.id);
                    const marketName = await getMarketNameRes(tab.id);
                    const link = await getLinkInfo(tab.id);

                    const maxItemCount = 2720;
                    let totalCount = 0;
                    let itemCounter = 0;
                    let totalICount = 0;
                    let codes = "";
                    const startTime = new Date()
                        .toLocaleString("tr-TR", {
                            year: "numeric",
                            month: "2-digit",
                            day: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                        })
                        .replace(/[.]/g, "/")
                        .replace(",", "");

                    const pagePromises = [];

                    for (let i = 0; i <= maxPage; i++) {
                        const pageUrl = `https://www.amazon.ca/s?me=${link.me}&marketplaceID=${link.marketplaceID}&page=${i}`;
                        pagePromises.push(
                            (async () => {
                                const urls = await getAmazonURLs(tab.id, pageUrl);
                                // Process the URLs for this page
                                // console.log(urls);
                                return urls;
                            })()
                        );
                    }
                    try {
                        const results = await Promise.all(pagePromises);
                        const fragment = document.createDocumentFragment(); // Bir belge parçacığı oluştur

                        for (const urls of results) {
                            urlsCount.textContent = urls.length;
                            totalCount += urls.length;

                            const listItems = [];

                            const regex = /dp\/([^/]+)/;
                            const listSize = Math.min(urls.length, maxItemCount - itemCounter);

                            for (let i = 0; i < listSize; i++) {
                                const url = urls[i];
                                const match = url.match(regex);

                                if (match && match[1]) {
                                    const productCode = match[1];
                                    codes += productCode + ";";
                                    totalICount++;
                                    itemCounter++;
                                } else {
                                    console.log("Ürün kodu bulunamadı.");
                                }

                                if (itemCounter >= maxItemCount) {
                                    break;
                                }
                            }

                            urlsList.append(...listItems);

                            if (itemCounter >= maxItemCount) {
                                break;
                            }
                        }


                        urlsList.appendChild(fragment); // Parçacığı listeye ekle
                        countElement.textContent = `Toplam Sayı: ${totalCount}`;
                        console.log(codes);
                        console.log(magazaId);
                        console.log(startTime);
                        const endTime = new Date()
                            .toLocaleString("tr-TR", {
                                year: "numeric",
                                month: "2-digit",
                                day: "2-digit",
                                hour: "2-digit",
                                minute: "2-digit",
                                second: "2-digit",
                            })
                            .replace(/[.]/g, "/")
                            .replace(",", "");
                        console.log(endTime);
                        console.log(marketName);
                        console.log("--------");



                        fetch(`${api}editname/${link.me}/${marketName}`, {
                            method: 'GET'
                        })
                            .then(response => response.json())
                            .then(data => {
                                console.log(data);
                            })
                            .catch(error => {
                                console.error(error);
                            });


                        newCodes = codes;
                        newMagazaId = magazaId;
                        newTotalCount = totalCount;
                        newStartTime = startTime;
                        newEndTime = endTime;
                        if (magazaId && totalCount && startTime && endTime) {
                            if (codes != "") {
                                fetchAdd(codes, magazaId, totalCount, startTime, endTime);
                            } else {
                                console.log("codes bos");
                            }
                        }


                        // İşlem tamamlandığında, diğer mağazayı işleyebilmek için döngüyü tekrar çağırın
                        urls.splice(currentIndex, 1);
                        processNextMagaza();
                        chrome.tabs.remove(tabId);
                    } catch (error) {
                        console.error(error);
                    }
                }
            }

            await chrome.tabs.onUpdated.addListener(listener);
        }
        const existingMagazas = [];
        async function checkForNewMagaza() {
            const response = await fetch(`${api}magazadurum0`);
            const data = await response.json();
            const newUrls = data.magazalar.map((res) => ({
                amazonUrl: res.amazonUrl,
                magazaId: res.magazaid,
            }));

            if (newUrls.length > 0) {
                const newUrl = newUrls[0]; // Take only the first new store URL

                const existingMagazaIndex = urls.findIndex(
                    (url) =>
                        url.amazonUrl === newUrl.amazonUrl && url.magazaId === newUrl.magazaId
                );

                if (existingMagazaIndex !== -1) {
                    const existingMagaza = urls[existingMagazaIndex];
                    console.log("Bu mağaza zaten mevcut ve güncelleniyor:", existingMagaza);
                    existingMagaza.magazaId = newUrl.magazaId; // Mağaza ID güncelle
                    console.log(
                        "Bu mağazanın URL'si zaten taranmış, tekrar taranacak:",
                        existingMagaza
                    );

                    // Mağazayı işle
                    await processMagaza(existingMagaza.amazonUrl, existingMagaza.magazaId);

                    // Mağazayı listeden kaldırma
                    urls.splice(existingMagazaIndex, 1);
                } else {
                    const tabExists = await checkIfTabExists(newUrl.amazonUrl);
                    if (!tabExists) {
                        const existingMagazasWithSameUrl = existingMagazas.filter(
                            (magaza) => magaza.amazonUrl === newUrl.amazonUrl
                        );

                        if (existingMagazasWithSameUrl.length === 0) {
                            existingMagazas.push(newUrl); // Yeni mağazayı ekle
                            console.log("Yeni mağaza eklendi:", newUrl);

                            // Mağazayı işle
                            await processMagaza(newUrl.amazonUrl, newUrl.magazaId);
                        } else {
                            console.log("Bu mağaza zaten eklenmiş ve bekliyor:", newUrl);

                            // Apply processMagaza() to all existing magazas with the same URL
                            for (const magaza of existingMagazasWithSameUrl) {
                                await processMagaza(magaza.amazonUrl, magaza.magazaId);
                            }
                        }

                        // Apply fetchAdd() to all URLs with the same Amazon URL but different magazaIds
                        const newMagazaIds = newUrls.map((newUrl) => newUrl.magazaId);
                        const existingMagazaIds = existingMagazas.map((magaza) => magaza.magazaId);

                        const magazaIdsToAdd = newMagazaIds.filter(
                            (magazaId) => !existingMagazaIds.includes(magazaId)
                        );

                        for (const magazaId of magazaIdsToAdd) {
                            if (magazaId && newTotalCount && newStartTime && newEndTime) {
                                if (newCodes != "") {
                                    await fetchAdd(newCodes, magazaId, newTotalCount, newStartTime, newEndTime);
                                } else {
                                    console.log("newcodes bos");
                                }
                            }
                        }
                    } else {
                        console.log("Bu mağaza zaten bir tabda açık:", newUrl);
                    }
                }
            } else {
                console.log("Yeni mağaza bulunamadı.");

                // Tüm mağazaları işle
                for (const url of urls) {
                    console.log("Mağaza işleniyor:", url);
                    await processMagaza(url.amazonUrl, url.magazaId);
                }
            }
        }
        async function checkIfTabExists(amazonUrl) {
            return new Promise((resolve) => {
                chrome.tabs.query({ url: amazonUrl }, (tabs) => {
                    resolve(tabs.length > 0); // Resolve with true if there are tabs matching the URL, otherwise false
                });
            });
        }
        async function processNextMagaza() {
            if (currentIndex < urls.length) {
                const { amazonUrl, magazaId } = urls[currentIndex];
                currentIndex++;

                await processMagaza(amazonUrl, magazaId); // Wait for the function to complete before moving on
                processNextMagaza(); // Move on to the next iteration
            } else {
                // All stores have been processed, do something else or stop the loop
                console.log("Tüm mağazalar işlendii.");
            }
        }

        async function startMagazaAdditionCheck() {
            intervalId = setInterval(checkForNewMagaza, 1000);
        }

        const processAllMagazas = async () => {
            const promises = urls.map((url) => processMagaza(url.amazonUrl, url.magazaId));
            await Promise.all(promises);

            // Tüm mağazalar işlendiğinde yapılacak işlemler
            console.log("Tüm mağazalar işlendi.");
        };

        processAllMagazas()

        startMagazaAdditionCheck();
    });

    async function fetchAdd(codes, magazaId, totalCount, startTime, endTime) {
        fetch(`${api}add`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                asins_asin: codes,
                magaza_id: magazaId,
                count: totalCount,
                start_time: startTime,
                end_time: endTime
            })
        })
            .then(response => {
                if (response.ok) {
                    console.log('Başarılı istek');
                } else {
                    console.error('İstek hatası: ' + response.status);
                }
            })
            .catch(error => {
                console.error('Ağ hatası:', error);
            });

    }
})
// document.addEventListener("DOMContentLoaded", function () {
//     const extractButton = document.getElementById("extractButton");
//     const urlsList = document.getElementById("urlsList");
//     const urlsCount = document.getElementById("urlsCount");
//     const countElement = document.getElementById("count");
//     const api = "http://localhost:5000/api/";

//     let requestCount = 0; // İstek sayacı
//     const openedTabs = []; // Açılan tabları takip etmek için dizi
//     let openTabs = []; // Aktif sekme bilgilerini tutmak için dizi

//     let intervalId; // setInterval işlevinden dönen aralık kimliği
//     // A2W8EY4J0UOJZR

//     let newCodes;
//     let newMagazaId;
//     let newTotalCount;
//     let newStartTime;
//     let newEndTime;

//     extractButton.addEventListener("click", async () => {
//         urlsList.innerHTML = "";
//         countElement.textContent = "Yükleniyor...";
//         requestCount = 0; // İstek sayacını sıfırla
//         openedTabs.length = 0; // Açılan tabları temizle
//         openTabs = await chrome.tabs.query({}); // Aktif sekmeleri al

//         let urls = [];

//         try {
//             const response = await fetch(`${api}magazadurum0`);
//             const data = await response.json();

//             urls = data.magazalar.map((res) => ({
//                 amazonUrl: res.amazonUrl,
//                 magazaId: res.magazaid,
//             }));
//         } catch (error) {
//             console.log("İstek sırasında hata oluştu:", error);
//         }

//         let currentIndex = 0; // Şu an işlenen mağazanın dizideki indeksi



//         const processedUrls = []; // İşlenen URL'leri takip etmek için bir dizi oluştur
//         async function processMagaza(url, magazaId) {
//             const openedTabUrls = openTabs.map((tab) => tab.url);

//             if (processedUrls.includes(url)) {
//                 console.log("Bu URL zaten işlenmiş ve güncelleniyor:", url);
//                 const urlIndex = processedUrls.indexOf(url);
//                 processedUrls.splice(urlIndex, 1); // İşlenen URL'yi listeden kaldır
//                 return; // URL'yi tekrar işlememek için fonksiyondan çık
//             }

//             // Check if the URL is already opened
//             if (openedTabUrls.includes(url)) {
//                 console.log("Bu URL zaten bir tabda açık:", url);
//                 return; // Aynı URL'yi tekrar açmamak için fonksiyondan çık
//             }

//             processedUrls.push(url); // İşlenen URL'leri `processedUrls` dizisine ekle

//             // Yeni bir tab aç ve URL'yi yükle
//             const tab = await chrome.tabs.create({ url: url, active: false });

//             // İşlemler devam ederken yeni bir sekme açıldığında veya mevcut sekme güncellendiğinde işlem tamamlanmamış olacağından, işleme devam etmeden önce tabloya ekleyelim.
//             openTabs.push(tab);

//             const listener = async function (tabId, changeInfo) {
//                 if (tabId === tab.id && changeInfo.status === "complete") {
//                     chrome.tabs.onUpdated.removeListener(listener);
//                     console.log("Yeni sekme açıldı:", url);

//                     // Başlık kontrolü
//                     const tabInfo = await chrome.tabs.get(tabId);
//                     if (tabInfo.title === "Amazon.ca Something Went Wrong / Quelque chose s'est mal passé") {
//                         console.log("Engellendi: Something Went Wrong sayfası");
//                         chrome.tabs.remove(tabId)
//                         processNextMagaza(); // İşlem tamamlandığında, diğer mağazayı işleyebilmek için döngüyü tekrar çağırın
//                         return;
//                     }

//                     const maxPage = await getMaxPage(tab.id);
//                     const marketName = await getMarketNameRes(tab.id);
//                     const link = await getLinkInfo(tab.id);

//                     const maxItemCount = 2720;
//                     let totalCount = 0;
//                     let itemCounter = 0;
//                     let totalICount = 0;
//                     let codes = "";
//                     const startTime = new Date()
//                         .toLocaleString("tr-TR", {
//                             year: "numeric",
//                             month: "2-digit",
//                             day: "2-digit",
//                             hour: "2-digit",
//                             minute: "2-digit",
//                             second: "2-digit",
//                         })
//                         .replace(/[.]/g, "/")
//                         .replace(",", "");

//                     const pagePromises = [];

//                     for (let i = 0; i <= maxPage; i++) {
//                         const pageUrl = `https://www.amazon.ca/s?me=${link.me}&marketplaceID=${link.marketplaceID}&page=${i}`;
//                         pagePromises.push(
//                             (async () => {
//                                 const urls = await getAmazonURLs(tab.id, pageUrl);
//                                 // Process the URLs for this page
//                                 // console.log(urls);
//                                 return urls;
//                             })()
//                         );
//                     }
//                     try {
//                         const results = await Promise.all(pagePromises);
//                         const fragment = document.createDocumentFragment(); // Bir belge parçacığı oluştur

//                         for (const urls of results) {
//                             urlsCount.textContent = urls.length;
//                             totalCount += urls.length;

//                             const listItems = [];

//                             const regex = /dp\/([^/]+)/;
//                             const listSize = Math.min(urls.length, maxItemCount - itemCounter);

//                             for (let i = 0; i < listSize; i++) {
//                                 const url = urls[i];
//                                 const match = url.match(regex);

//                                 if (match && match[1]) {
//                                     const productCode = match[1];
//                                     codes += productCode + ";";
//                                     totalICount++;
//                                     itemCounter++;
//                                 } else {
//                                     console.log("Ürün kodu bulunamadı.");
//                                 }

//                                 if (itemCounter >= maxItemCount) {
//                                     break;
//                                 }
//                             }

//                             urlsList.append(...listItems);

//                             if (itemCounter >= maxItemCount) {
//                                 break;
//                             }
//                         }


//                         urlsList.appendChild(fragment); // Parçacığı listeye ekle
//                         countElement.textContent = `Toplam Sayı: ${totalCount}`;
//                         console.log(codes);
//                         console.log(magazaId);
//                         console.log(startTime);
//                         const endTime = new Date()
//                             .toLocaleString("tr-TR", {
//                                 year: "numeric",
//                                 month: "2-digit",
//                                 day: "2-digit",
//                                 hour: "2-digit",
//                                 minute: "2-digit",
//                                 second: "2-digit",
//                             })
//                             .replace(/[.]/g, "/")
//                             .replace(",", "");
//                         console.log(endTime);
//                         console.log(marketName);
//                         console.log("--------");



//                         fetch(`${api}editname/${link.me}/${marketName}`, {
//                             method: 'GET'
//                         })
//                             .then(response => response.json())
//                             .then(data => {
//                                 console.log(data);
//                             })
//                             .catch(error => {
//                                 console.error(error);
//                             });


//                         newCodes = codes;
//                         newMagazaId = magazaId;
//                         newTotalCount = totalCount;
//                         newStartTime = startTime;
//                         newEndTime = endTime;
//                         if (magazaId && totalCount && startTime && endTime) {
//                             if (codes != "") {
//                                 fetchAdd(codes, magazaId, totalCount, startTime, endTime);
//                             } else {
//                                 console.log("codes bos");
//                             }
//                         }


//                         // İşlem tamamlandığında, diğer mağazayı işleyebilmek için döngüyü tekrar çağırın
//                         urls.splice(currentIndex, 1);
//                         processNextMagaza();
//                         chrome.tabs.remove(tabId);
//                     } catch (error) {
//                         console.error(error);
//                     }
//                 }
//             }

//             await chrome.tabs.onUpdated.addListener(listener);
//         }
//         const existingMagazas = [];
//         async function checkForNewMagaza() {
//             const response = await fetch(`${api}magazadurum0`);
//             const data = await response.json();
//             const newUrls = data.magazalar.map((res) => ({
//                 amazonUrl: res.amazonUrl,
//                 magazaId: res.magazaid,
//             }));

//             if (newUrls.length > 0) {
//                 const newUrl = newUrls[0]; // Take only the first new store URL

//                 const existingMagazaIndex = urls.findIndex(
//                     (url) =>
//                         url.amazonUrl === newUrl.amazonUrl && url.magazaId === newUrl.magazaId
//                 );

//                 if (existingMagazaIndex !== -1) {
//                     const existingMagaza = urls[existingMagazaIndex];
//                     console.log("Bu mağaza zaten mevcut ve güncelleniyor:", existingMagaza);
//                     existingMagaza.magazaId = newUrl.magazaId; // Mağaza ID güncelle
//                     console.log(
//                         "Bu mağazanın URL'si zaten taranmış, tekrar taranacak:",
//                         existingMagaza
//                     );

//                     // Mağazayı işle
//                     await processMagaza(existingMagaza.amazonUrl, existingMagaza.magazaId);

//                     // Mağazayı listeden kaldırma
//                     urls.splice(existingMagazaIndex, 1);
//                 } else {
//                     const tabExists = await checkIfTabExists(newUrl.amazonUrl);
//                     if (!tabExists) {
//                         const existingMagazasWithSameUrl = existingMagazas.filter(
//                             (magaza) => magaza.amazonUrl === newUrl.amazonUrl
//                         );

//                         if (existingMagazasWithSameUrl.length === 0) {
//                             existingMagazas.push(newUrl); // Yeni mağazayı ekle
//                             console.log("Yeni mağaza eklendi:", newUrl);

//                             // Mağazayı işle
//                             await processMagaza(newUrl.amazonUrl, newUrl.magazaId);
//                         } else {
//                             console.log("Bu mağaza zaten eklenmiş ve bekliyor:", newUrl);

//                             // Apply processMagaza() to all existing magazas with the same URL
//                             for (const magaza of existingMagazasWithSameUrl) {
//                                 await processMagaza(magaza.amazonUrl, magaza.magazaId);
//                             }
//                         }

//                         // Apply fetchAdd() to all URLs with the same Amazon URL but different magazaIds
//                         const newMagazaIds = newUrls.map((newUrl) => newUrl.magazaId);
//                         const existingMagazaIds = existingMagazas.map((magaza) => magaza.magazaId);

//                         const magazaIdsToAdd = newMagazaIds.filter(
//                             (magazaId) => !existingMagazaIds.includes(magazaId)
//                         );

//                         for (const magazaId of magazaIdsToAdd) {
//                             if (magazaId && newTotalCount && newStartTime && newEndTime) {
//                                 if (newCodes != "") {
//                                     await fetchAdd(newCodes, magazaId, newTotalCount, newStartTime, newEndTime);
//                                 } else {
//                                     console.log("newcodes bos");
//                                 }
//                             }
//                         }
//                     } else {
//                         console.log("Bu mağaza zaten bir tabda açık:", newUrl);
//                     }
//                 }
//             } else {
//                 console.log("Yeni mağaza bulunamadı.");

//                 // Tüm mağazaları işle
//                 for (const url of urls) {
//                     console.log("Mağaza işleniyor:", url);
//                     await processMagaza(url.amazonUrl, url.magazaId);
//                 }
//             }
//         }
//         async function checkIfTabExists(amazonUrl) {
//             return new Promise((resolve) => {
//                 chrome.tabs.query({ url: amazonUrl }, (tabs) => {
//                     resolve(tabs.length > 0); // Resolve with true if there are tabs matching the URL, otherwise false
//                 });
//             });
//         }
//         async function processNextMagaza() {
//             if (currentIndex < urls.length) {
//                 const { amazonUrl, magazaId } = urls[currentIndex];
//                 currentIndex++;

//                 await processMagaza(amazonUrl, magazaId); // Wait for the function to complete before moving on
//                 processNextMagaza(); // Move on to the next iteration
//             } else {
//                 // All stores have been processed, do something else or stop the loop
//                 console.log("Tüm mağazalar işlendii.");
//             }
//         }

//         async function startMagazaAdditionCheck() {
//             intervalId = setInterval(checkForNewMagaza, 1000);
//         }

//         const processAllMagazas = async () => {
//             const promises = urls.map((url) => processMagaza(url.amazonUrl, url.magazaId));
//             await Promise.all(promises);

//             // Tüm mağazalar işlendiğinde yapılacak işlemler
//             console.log("Tüm mağazalar işlendi.");
//         };

//         processAllMagazas()

//         startMagazaAdditionCheck();
//     });

//     async function fetchAdd(codes, magazaId, totalCount, startTime, endTime) {
//         fetch(`${api}add`, {
//             method: 'POST',
//             headers: {
//                 'Content-Type': 'application/json'
//             },
//             body: JSON.stringify({
//                 asins_asin: codes,
//                 magaza_id: magazaId,
//                 count: totalCount,
//                 start_time: startTime,
//                 end_time: endTime
//             })
//         })
//             .then(response => {
//                 if (response.ok) {
//                     console.log('Başarılı istek');
//                 } else {
//                     console.error('İstek hatası: ' + response.status);
//                 }
//             })
//             .catch(error => {
//                 console.error('Ağ hatası:', error);
//             });

//     }
// });

async function getAmazonURLs(tabId, pageUrl) {
    try {
        const response = await fetch(pageUrl);
        const html = await response.text();

        const regex = /<a\s+class="a-link-normal\s+s-no-outline"\s+href="([^"]+)"/g;
        const urls = [];
        let match;

        while ((match = regex.exec(html)) !== null) {
            const url = "https://www.amazon.ca" + match[1];
            urls.push(url);
        }

        return urls;
    } catch (error) {
        console.error(error);
        return [];
    }
}

async function getPageHTML(url) {
    const response = await fetch(url);
    const html = await response.text();
    return html;
}

function getMaxPage(tabId) {
    return new Promise((resolve, reject) => {
        chrome.scripting.executeScript({
            target: { tabId: tabId },
            function: getMaxPageFromDOM,
        }, (results) => {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
            } else {
                resolve(results[0].result);
            }
        });
    });
}

function getMaxPageFromDOM() {
    var stripElement = document.querySelector('.s-pagination-strip');
    var pageNumbersElements = stripElement.querySelectorAll('.s-pagination-item:not(.s-pagination-previous):not(.s-pagination-next):not(.s-pagination-ellipsis)');

    var pageNumbers = Array.from(pageNumbersElements).map(function (element) {
        return parseInt(element.innerText);
    });

    var maxPageNumber = Math.max.apply(null, pageNumbers);

    return maxPageNumber;
}

function getMarketNameDOM() {
    var selectElement = document.getElementById("searchDropdownBox");
    var name = selectElement.options[0].text;
    return name
}

function getMarketNameRes(tabId) {
    return new Promise((resolve, reject) => {
        chrome.scripting.executeScript({
            target: { tabId: tabId },
            function: getMarketNameDOM,
        }, (results) => {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
            } else {
                resolve(results[0].result);
            }
        });
    });
}


function linkInfo() {
    var link = window.location.href;
    var url = new URL(link);

    var linkData = {};
    linkData.me = url.searchParams.get('me');
    linkData.marketplaceID = url.searchParams.get('marketplaceID');

    return linkData;
}

function getLinkInfo(tabId) {
    return new Promise((resolve, reject) => {
        chrome.scripting.executeScript({
            target: { tabId: tabId },
            function: linkInfo,
        }, (results) => {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
            } else {
                resolve(results[0].result);
            }
        });
    });
}