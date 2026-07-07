let familyData = [];
const panel = document.getElementById('sidePanel');
const treeContainer = document.getElementById('tree_div');
var openedPanel = false;
var currentPersonId = null;

function openPanel(person) {
    const titlePanel = document.getElementById('sideTitle');
    titlePanel.textContent = person.name;
    const dataPanel = document.getElementById('sideData');
    dataPanel.textContent = `${person.birthplace} - ${person.birthdate} - ${person.deathdate ?? ''}`;
    const historyPanel = document.getElementById('sideHistory');
    historyPanel.innerHTML = '';
    if(person.pictures){
        historyPanel.innerHTML = `${person.pictures?.map(x => `<img width="100%" src="./public/${x}" />`).join('<br />')}`
    }

    panel.classList.add('open');
    treeContainer.classList.add('show');
    openedPanel = true;
}

function closePanel() {
    panel.classList.remove('open');
    treeContainer.classList.remove('show');
    openedPanel = false;
}

/* ESC billentyű */
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && openedPanel) {
        closePanel();
    }
});

// Külső JSON fájl aszinkron beolvasása (Fetch API)
async function loadFamilyTree() {
    try {
        const response = await fetch('family.json');
        if (!response.ok) throw new Error('Nem sikerült beolvasni a JSON fájlt.');
        
        familyData = await response.json();
        
        buildTree();
    } catch (error) {
        console.error('Hiba történt:', error);
        document.getElementById('tree_div').innerHTML = `<p style="color:red; text-align:center;">Hiba az adatok betöltése közben: ${error.message}</p>`;
    }
}

function getSiblings(levels,person, asc) {
    if (!person) return [];
    if (person.parents && person.parents.length > 0) {
        const siblings = familyData.filter(p => 
            p.id !== person.id
            && p.parents
            && p.parents.length > 0
            && [...p.parents].sort().every((v, i) => v === [...person.parents].sort()[i])
            && !isAdded(levels, p.id));
        if(siblings.length > 0) {
            return siblings.sort((a, b) => (asc)? new Date(a.birthday).getTime() - new Date(b.birthday).getTime() : new Date(b.birthday).getTime() - new Date(a.birthday).getTime()).map(s => s.id);
        }
    }
    return [];
}

function isAdded(levels,personId) {
    return Object.values(levels).some(level => level.includes(personId));
}

function addPersonToLevel(levels, level, person) {
    if(!person || isAdded(levels, person.id)) {
        return;
    }
    const parents = person.parents || [];
    if(parents.length > 0) {
        parents.forEach(pid => {
            addPersonToLevel(levels, level - 1, familyData.find(p => p.id === pid));
        });
        const parentLevel = Object.keys(levels).find(lvl => levels[lvl].includes(parents[0]));
        if(parentLevel) {
            level = parseInt(parentLevel) + 1;
        }
    }
    if(!levels[level]) {
        levels[level] = [];
    }
    levels[level].push(person.id);
}

function buildTree() {
    const levels = {};
    for(let i = 0; i < familyData.length; i++) {
        const person = familyData[i];
        addPersonToLevel(levels, 100, person);
    }
    const sortedLevels = Object.keys(levels).sort((a, b) => a - b);
    const generations = [];
    sortedLevels.forEach(level => {
        let sortedGeneration = [];
        const generation = levels[level];
        generation.forEach(pid => {
            const person = familyData.find(p => p.id === pid);
            if(sortedGeneration.some(g => g.includes(pid))) {
                return;
            }
            const siblings = addSiblings(pid,person,generation);
            if(person.husband) {
                sortedGeneration.push([person.husband, pid]);
                siblings.forEach(x => {
                    if(!sortedGeneration.some(g => g.includes(x))) {
                        sortedGeneration.push([x]);
                    }
                });
            }
            else if(person.wife) {
                siblings.forEach(x => {
                    if(!sortedGeneration.some(g => g.includes(x))) {
                        sortedGeneration.push([x]);
                    }
                });
                sortedGeneration.push([pid, person.wife]);
            } else {
                sortedGeneration.push([pid]);
            }
        });
        generations.push(sortedGeneration);
    });

    showCards(generations);
}

function addSiblings(pid, person, generation) {
    const siblings = generation.filter(sid => {
        if(sid === pid) return false;
        const sibling = familyData.find(p => p.id === sid);
        if(sibling && sibling.parents && sibling.parents.some(parentId => person.parents.includes(parentId))) {
            return true;
        }
        return false;
    });
    return siblings;
}

function showCards(generations) {
    // HTML elemek kirajzolása
    treeContainer.className = 'tree-container';
    treeContainer.innerHTML = '';

    generations.forEach(pairs => {
        const rowDiv = document.createElement('div');
        rowDiv.className = 'generation';

        pairs.forEach((pair) => {
            const pairDiv = document.createElement('div');
            pairDiv.className = 'members-pair';
            pairDiv.style.left = '50px';
            pair.forEach((personId) => {
                pairDiv.appendChild(createMemberCard(personId));
            });
            rowDiv.appendChild(pairDiv);
        });

        treeContainer.appendChild(rowDiv);
    });

    // elemek közötti vonalak
    const svg = document.getElementById('tree_svg');
    const treeRect = treeContainer.getBoundingClientRect();
    svg.setAttribute('width', treeRect.width);
    svg.setAttribute('height', treeRect.height);
    for(let i = 0; i < generations.length - 1; i++) {
        const currentGen = generations[i];
        for(let j = 0; j < currentGen.length; j++) {
            const pair = currentGen[j];
            const person = pair[0];
            const personDiv = document.getElementById(person);
            const personRect = personDiv.getBoundingClientRect();
            const personWidth = personRect.width;
            const personLeft = personRect.left;
            const pairCenterX = (pair.length === 1) ? (personWidth / 2) : (personLeft + personWidth + 10);
            let pairCenterY = personRect.bottom;
            if(pair.length === 2) {
                line(svg, (personLeft + personWidth / 2), pairCenterY, personLeft + personWidth / 2, pairCenterY + 5); // függőleges vonal egyik szülőtől
                const parentDiv = document.getElementById(pair[1]);
                const parentRect = parentDiv.getBoundingClientRect();
                line(svg, (parentRect.left + parentRect.width / 2), pairCenterY, parentRect.left + parentRect.width / 2, pairCenterY + 5); // függőleges vonal másik szülőtől
                line(svg, (personLeft + personWidth / 2), pairCenterY + 5, parentRect.left + parentRect.width / 2, pairCenterY + 5); // vízszintes vonal a két függőleges vonal között
                pairCenterY += 5; // a vízszintes vonal alatti pont
            }
            familyData.forEach(child => {
                if(child.parents && child.parents.includes(person)) {
                    const childDiv = document.getElementById(child.id);
                    const childRect = childDiv.getBoundingClientRect();
                    const vectorY = pairCenterY + ((childRect.top - pairCenterY) / 2) + (j * 8);
                    line(svg, pairCenterX, pairCenterY, pairCenterX, vectorY); // függőleges vonal szülőktól félútig
                    const childCenterX = childRect.left + (childRect.width / 2);
                    const childCenterY = childRect.top;
                    line(svg, childCenterX, childCenterY, childCenterX, vectorY); // függőleges vonal gyerektől félútig
                    line(svg, childCenterX, vectorY, pairCenterX, vectorY); // vízszintes vonal a két függőleges vonal között
                }
            });
        }
    }
}

function line(svg,x1,y1,x2,y2){
    const l = document.createElementNS("http://www.w3.org/2000/svg","line");
    l.setAttribute("x1",x1);
    l.setAttribute("y1",y1);
    l.setAttribute("x2",x2);
    l.setAttribute("y2",y2);
    l.setAttribute("class","link");
    l.setAttribute("fill", "#ffdce8");
    l.setAttribute("stroke-width", 2);
    l.setAttribute("stroke", "#a16077");
    svg.appendChild(l);
}

function createMemberCard(personId) {
    const person = familyData.find(p => p.id === personId);
    const card = document.createElement('div');
    card.className = 'member-card';
    card.id = `${person.id}`;
    card.addEventListener('click', () => {
        if(openedPanel) {
            closePanel();
            if(currentPersonId !== person.id) {
                openPanel(person);
                currentPersonId = person.id;
            }
        } else {
            openPanel(person);
        }
    });    
    if (person.gender === 'férfi') {
        card.classList.add('card-male');
    } else if (person.gender === 'nő') {
        card.classList.add('card-female');
    }

    const detailsHTML = 
    `<div class="member-name" title="${person.name}">${person.name}</div>
    <div class="member-details">
        <div>${person.birthdate}</div>
        <div>${person.birthplace}</div>
     </div>`;

    card.innerHTML = detailsHTML;
    return card;
}

// Indítás az oldal betöltődésekor
window.addEventListener('DOMContentLoaded', loadFamilyTree);

/*function drawGroup(group) {
    const svg = document.getElementById("tree");
    const BOX_W = 150;
    const BOX_H = 60;
    const centers = [];
    let x = 20;
    let y = 20;

    Object.keys(group).forEach((level, i) => {
        const row = group[level];
        y = 20 + i * (BOX_H + 40);
        row.forEach((pid, j) => {
            x = 20 + j * (BOX_W + 20);
            const p = familyData.find(p => p.id === pid);
            const rectEl = rect(x, y, BOX_W, BOX_H, p.gender);
            svg.appendChild(rectEl);
            const text = document.createElementNS("http://www.w3.org/2000/svg","text");
            text.setAttribute("x", x + BOX_W/2);
            text.setAttribute("y", y + 30);
            text.setAttribute("text-anchor","middle");
            text.textContent = p.name;
            svg.appendChild(text);
        });
    });
}
    group.partners.forEach((p, i) => {
        const x = group.x + i * (BOX_W + 20);
        const y = group.y;
        p._x = x;
        p._y = y;
        const g = document.createElementNS("http://www.w3.org/2000/svg","g");
        const rect = document.createElementNS("http://www.w3.org/2000/svg","rect");
        rect.setAttribute("x", x);
        rect.setAttribute("y", y);
        rect.setAttribute("width", BOX_W);
        rect.setAttribute("height", BOX_H);
        rect.setAttribute("fill", p.gender === "nő" ? "#ffdce8" : "#d9ecff");
        g.appendChild(rect);
        const text = document.createElementNS("http://www.w3.org/2000/svg","text");
        text.setAttribute("x", x + BOX_W/2);
        text.setAttribute("y", y + 30);
        text.setAttribute("text-anchor","middle");
        text.textContent = p.name;
        g.appendChild(text);
        svg.appendChild(g);
        centers.push({
            x: x + BOX_W/2,
            y: y + BOX_H
        });
    });

    // házaspár összekötése
    if (centers.length === 2) {
        line(
            centers[0].x, centers[0].y,
            centers[1].x, centers[1].y
        );
    }

    group.centerX =
        centers.reduce((a,c)=>a+c.x,0) / centers.length;
    group.centerY = centers[0].y;

function drawLinks(people, groups) {
    const byId = {};
    people.forEach(p => byId[p.id] = p);
    groups.forEach(g => {
        const parentCenterX = g.centerX;
        const parentCenterY = g.centerY;
        g.partners.forEach(p => {
            if (!p.parents) return;
            p.parents.forEach(pid => {
                const parent = byId[pid];
                if (!parent || !parent._x) return;
                line(
                    parent._x + 75,
                    parent._y + 60,
                    parentCenterX,
                    parentCenterY + 60
                );
            });
        });
    });
}
function rect(x,y,w,h,gender){
    const r = document.createElementNS("http://www.w3.org/2000/svg","rect");
    r.setAttribute("x", x);
    r.setAttribute("y", y);
    r.setAttribute("width", w);
    r.setAttribute("height", h);
    r.setAttribute("stroke-width", 2);
    r.setAttribute("stroke", gender === "nő" ? "#a16077" : "#6fadeb");
    r.setAttribute("fill", "white");
    return r;
}

function line(x1,y1,x2,y2){
    const l = document.createElementNS("http://www.w3.org/2000/svg","line");
    l.setAttribute("x1",x1);
    l.setAttribute("y1",y1);
    l.setAttribute("x2",x2);
    l.setAttribute("y2",y2);
    l.setAttribute("class","link");
    svg.appendChild(l);
}
*/
