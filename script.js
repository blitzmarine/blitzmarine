const url = 'https://api.codetabs.com/v1/proxy?quest=https://docs.google.com/spreadsheets/d/1vtGGgzBcBwa_m0Q0QOH3t83O2GgPpj5WlVQvRTt5D8A/edit?gid=0#gid=0';
const ranks = [
    'Fleet Admiral',
    'Admiral',
    'Vice Admiral',
    'Rear Admiral',
    'Commodore',
    'Captain',
    'Commander',
    'Lieutenant Commander',
    'Lieutenant',
    'Sub-Lieutenant',
    'Midshipman',
    'Chief Warrant Officer',
    'Warrant Officer',
    'Master Chief Petty Officer',
    'Senior Chief Petty Officer',
    'Chief Petty Officer',
    'Petty Officer',
    'Leading Seaman',
    'Able Seaman',
    'Ordinary Seaman'
]
var currentType = 0

function dcreate(tag, className=null) {
    const e = document.createElement(tag)
    if (className) {
        e.className = className
    }
    return e
}

function parseDate(dateStr) {
    let parts = dateStr.split('/');
    let month = parseInt(parts[0], 10);
    let day = parseInt(parts[1], 10);
    let year = parseInt(parts[2], 10);
    return new Date(year, month - 1, day);
}

function sortType() {
    if (currentType == 0) {
        results.sort((a, b) => a.rank.value - b.rank.value)
    } else if (currentType == 1) {
        results.sort((a, b) => a.valor - b.valor)
        results.reverse()
    } else {
        results.sort((a, b) => parseDate(a.joined) - parseDate(b.joined))
    }
}

function setSelection(e, type) {
    document.getElementsByClassName("selected-item")[0].classList.remove("selected-item")
    e.classList.add("selected-item")
    currentType = type
    sortType()
    renderMemberCards(results)
}

function renderMemberCards(data) {
    const grid = document.querySelector("#database")
    grid.innerHTML = ""
    data.forEach(function(member) {
        if (member.roblox_data == null) {
            member.roblox_data = {
                'id': 'undefined',
                'displayName': member.username,
                'avatar': 'unknown.png'
            }
        }
        const memberCard = dcreate("a", "member-card centered-vertically")
        memberCard.href = `https://www.roblox.com/users/${member.roblox_data.id}/profile`
        memberCard.target = "_blank"
        const imgContainer = dcreate("div", "img-container")
        const img = dcreate("img")
        img.src = member.roblox_data.avatar
        const imgOverlay = dcreate("div", "img-overlay")
        imgContainer.append(img, imgOverlay)
        const memberText = dcreate("div", "member-text")
        const headerText = dcreate("div", "centered-vertically")
        headerText.style.gap = "0.3rem"
        headerText.style.marginBottom = "0.3rem"
        const rankIcon = dcreate("img", "rank-icon")
        rankIcon.src = `ranks/${member.rank.value}.png`
        const name = dcreate("b")
        name.innerHTML = `${member.roblox_data.displayName} (${member.username})`
        headerText.append(rankIcon, name)
        const rank = dcreate("div")
        rank.innerHTML = member.rank.name
        memberText.append(headerText, rank)
        const memberDetails = dcreate("div", "member-details")
        const joined = dcreate("div")
        joined.innerHTML = `Joined: ${member.joined}`
        const valor = dcreate("div")
        valor.innerHTML = `Valor: ${member.valor}`
        if (member.valor == 0) {
            valor.innerHTML = "Valor: <span style='color: var(--accent-dark)'>N/A</span>"
        }
        memberDetails.append(joined, valor)
        memberCard.append(imgContainer, memberText, memberDetails)
        grid.append(memberCard)
    })
}

var database
var results
database = localStorage.getItem("database")
lastUpdated = localStorage.getItem("lastUpdated")

window.onload = function() {
    const input = document.querySelector("#search")
    search.oninput = function(e) {
        results = []
        let query = input.value.toLowerCase()
        database.forEach(function(item) {
            if (item.username.toLowerCase().includes(query) || item.roblox_data.displayName.toLowerCase().includes(query)) {
                results.push(item)
            }
        })
        sortType()
        renderMemberCards(results)
    }

    if (!database || ((new Date().getTime() - new Date(parseInt(lastUpdated)).getTime()) / (1000 * 60 * 60)) >= 1) {
        document.querySelector("#loaderText").innerHTML = "Importing from Google Sheets"
        axios.get(url).then(response => {
            const $ = jQuery;
            const html = response.data;
            const parsedHTML = $.parseHTML(html);
            const table = $(parsedHTML).find('table.waffle');
            const rows = table.find('tbody tr');
    
            let members = [];
            document.querySelector("#loaderText").innerHTML = "Parsing sheet data"
            rows.each((index, row) => {
                if (index > 0) { // Skip the header row
                    const data = $(row).find('td.s1');
                    if (data.length && $(data[0]).text().trim()) {
                        const rank = $(data[1]).text();
                        let joined, valor;

                        if ($(data[2]).text() === "") {
                            joined = $(data[3]).text();
                            valor = $(data[4]).text();
                        } else {
                            joined = $(data[2]).text();
                            valor = $(data[3]).text();
                        }

                        if (valor === 'x') valor = 0;

                        members.push({
                            username: $(data[0]).text(),
                            rank: {
                                name: rank,
                                value: ranks.indexOf(rank)
                            },
                            joined: joined,
                            valor: valor
                        });
                    }
                }
            });
    
            members.sort((a, b) => a.rank.value - b.rank.value);
            const usernames = members.map(member => member.username);
    
            document.querySelector("#loaderText").innerHTML = "Fetching user data"
            axios.post('https://users.roproxy.com/v1/usernames/users', {
                usernames: usernames
            })
            .then(response => {
                const user_data = response.data.data;
                const batch_data = user_data.map(item => ({
                    requestId: `${item.id}:undefined:AvatarHeadshot:150x150:webp:regular`,
                    type: 'AvatarHeadShot',
                    targetId: item.id,
                    format: 'webp',
                    size: '150x150'
                }));
            
                document.querySelector("#loaderText").innerHTML = "Fetching user thumbnails"
                return axios.post('https://thumbnails.roproxy.com/v1/batch', batch_data)
                    .then(thumbnailResponse => {
                        const thumbnails = thumbnailResponse.data.data;
                        const thumbnails_map = {};
            
                        thumbnails.forEach(item => {thumbnails_map[item.targetId] = item.imageUrl;});
                        
                        user_data.forEach(item => {item.avatar = thumbnails_map[item.id];});
                        
                        user_data_map = {};
                        user_data.forEach(item => {user_data_map[item.name] = item})
                        members.forEach(item => item.roblox_data = user_data_map[item.username])
    
                        database = members
                        results = members
                        localStorage.setItem("database", JSON.stringify(database))
                        localStorage.setItem("lastUpdated", new Date().getTime())
                        console.log('[DEBUG] Updated from Google Sheets')
                        
                        document.querySelector("#loaderText").innerHTML = "Rendering UI"
                        renderMemberCards(database)
                        document.querySelector("#loadingScreen").style.display = "none"
                    });
            })
        }).catch(error => {
            console.error('Error fetching the URL:', error);
        });
    } else {
        database = JSON.parse(database)
        results = database
        renderMemberCards(database)
        document.querySelector("#loadingScreen").style.display = "none"
    }
}