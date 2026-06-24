const fs = require('fs');
let content = fs.readFileSync('script.js', 'utf8');

// Match Seeker Replacement
const matchRegex = /container\.innerHTML = seekers\.map\(s => \{[\s\S]*?\}\)\.join\(''\);/g;

// Since there are two container.innerHTML = seekers.map..., the first one is match-seekers, second is team-seekers.
// We'll replace both with specific logic.
let matches = [...content.matchAll(/container\.innerHTML = seekers\.map\(s => \{[\s\S]*?\}\)\.join\(''\);/g)];

if (matches.length >= 2) {
    const matchSeekerRepl = `container.innerHTML = seekers.map(s => {
        let dates = [], hours = [];
        try { dates = JSON.parse(s.availableDates || '[]'); } catch(e) {}
        try { hours = JSON.parse(s.availableHours || '[]'); } catch(e) {}
        let feeText = s.requestedFee;
        if (feeText && !isNaN(feeText)) feeText = feeText + ' TL';
        const avgRating = parseFloat(s.averageRating) || 0;
        const reviewCount = parseInt(s.reviewCount) || 0;
        const ratingHtml = reviewCount > 0 ? \`<span style="color:#fbbf24; font-weight:700; font-size:0.75rem;">? \${avgRating.toFixed(1)} (\${reviewCount} Oy)</span>\` : \`<span style="color:var(--text-muted); font-size:0.7rem;">? Yeni Oyuncu</span>\`;
        const isOwner = currentUser && s.user_id && s.user_id === currentUser.id;
        const foundBadge = s.status === 'bulundu' ? '<div style="background:#10b981;color:#000;padding:4px 8px;border-radius:4px;font-weight:700;font-size:0.75rem;text-align:center;white-space:nowrap;">ANLAÞMA SAÐLANDI</div>' : '';
        const posClass = s.position.replace(/\\s+/g, '-');
        
        return \`
        <div class="match-seeker-card" id="match-post-\${s.id}" style="display: grid; grid-template-columns: 1fr auto; gap: 8px; align-items: start; padding: 12px; background: #1f2937; border: 1px solid rgba(16, 185, 129, 0.2); border-radius: 8px; margin-bottom: 12px;">
            <!-- Top Left: Date/Time -->
            <div style="grid-column: 1; grid-row: 1; font-size: 0.8rem; color: var(--text-muted); display:flex; gap:4px; flex-wrap:wrap;">
                \${dates.map(d => \`<span class="match-tag date-tag" style="padding:2px 4px;font-size:0.7rem;">\${d}</span>\`).join('')}
                \${hours.map(h => \`<span class="match-tag hour-tag" style="padding:2px 4px;font-size:0.7rem;">\${h}</span>\`).join('')}
            </div>
            
            <!-- Top Right: Position -->
            <div style="grid-column: 2; grid-row: 1; text-align: right;">
                <span class="match-tag position \${posClass}" style="padding:2px 6px; font-size:0.75rem;">\${s.position}</span>
            </div>
            
            <!-- Bottom Left: Details -->
            <div style="grid-column: 1; grid-row: 2; font-size: 0.8rem; display: flex; flex-direction: column; gap: 4px;">
                <div style="font-weight:bold;">\${s.playerName} <span style="color:var(--text-muted); font-weight:normal; font-size:0.75rem;">(\${s.age} Yaþ\${s.height ? \`, \${s.height}cm\` : ''}\${s.weight ? \`, \${s.weight}kg\` : ''})</span></div>
                \${ratingHtml}
                <div style="color:var(--neon-green); font-size:0.75rem;">\${feeText ? 'ÜCRET: ' + feeText : 'ÜCRETSÝZ'}</div>
                \${s.msg ? \`<div style="font-style:italic; font-size:0.75rem;">"\${s.msg.toLocaleUpperCase('tr-TR')}"</div>\` : ''}
            </div>
            
            <!-- Bottom Right: Buttons -->
            <div style="grid-column: 2; grid-row: 2; display: flex; flex-direction: column; justify-content: flex-end; align-items: flex-end; gap: 5px;">
                \${foundBadge}
                \${isOwner && s.status !== 'bulundu' ? '<button class="action-btn" style="padding:4px 12px;font-size:0.75rem;background:#f59e0b;color:#000;white-space:nowrap;border-radius:4px;border:none;cursor:pointer;" onclick="markMatchFound(' + s.id + ')">BULUNDU</button>' : ''}
                <button class="profile-btn" style="padding:4px 12px;font-size:0.75rem;border-radius:4px;" onclick="openPlayerProfile('\${s.phone || ''}', '\${s.playerName.replace(/'/g, "\\\\'")}', \${s.age}, '\${s.position}')">PROFÝL</button>
            </div>
            
            <!-- Comments -->
            <div style="grid-column: 1 / -1; grid-row: 3; margin-top: 5px;">
                <div class="card-comments-toggle" style="font-size: 0.8rem; padding: 6px;" onclick="toggleForumComments('match_seeker', \${s.id})">ÝLETÝÞÝM / YORUMLAR</div>
                <div id="forum-comments-match_seeker-\${s.id}" style="display:none;margin-top:8px;border-top:1px solid rgba(255,255,255,0.1);padding-top:8px;">
                    <div id="forum-comments-list-match_seeker-\${s.id}" style="max-height:150px;overflow-y:auto;margin-bottom:8px;font-size:0.8rem;"></div>
                    <div style="display:flex;gap:5px;align-items:center;">
                        <input type="text" id="forum-comment-text-\${s.id}" class="form-control" style="flex:1; padding: 6px; font-size: 0.8rem;" placeholder="\${loggedInUser ? 'Buradan yazýlýr...' : 'Giriþ yapýn...'}" \${loggedInUser ? '' : 'disabled'}>
                        <button style="padding:4px 8px; font-size:0.7rem; font-weight:700; border:none; border-radius:4px; background:var(--primary-green); color:#000; cursor:pointer;" onclick="submitForumComment('match_seeker', \${s.id})" \${loggedInUser ? '' : 'disabled'}>GÖNDER</button>
                    </div>
                </div>
            </div>
        </div>
        \`;
    }).join('');`;

    const teamSeekerRepl = `container.innerHTML = seekers.map(s => {
        const isOwner = loggedInUser && currentUser && parseInt(s.user_id) === parseInt(currentUser.id);
        let days = []; try { days = JSON.parse(s.availableDays || '[]'); } catch(e) { days = []; }
        let hours = []; try { hours = JSON.parse(s.timeRange || '[]'); if (!Array.isArray(hours)) hours = [s.timeRange]; } catch(e) { if (s.timeRange) hours = [s.timeRange]; else hours = []; }
        const foundBadge = s.status === 'bulundu' ? '<div style="background:#10b981;color:#000;padding:4px 8px;border-radius:4px;font-weight:700;font-size:0.75rem;text-align:center;white-space:nowrap;">TAKIM BULUNDU</div>' : '';
        
        return \`
        <div class="team-seeker-card" id="team-post-\${s.id}" style="display: grid; grid-template-columns: 1fr auto; gap: 8px; align-items: start; padding: 12px; background: #1f2937; border: 1px solid rgba(16, 185, 129, 0.2); border-radius: 8px; margin-bottom: 12px;">
            <!-- Top Left: Days/Hours -->
            <div style="grid-column: 1; grid-row: 1; font-size: 0.8rem; color: var(--text-muted); display:flex; gap:4px; flex-wrap:wrap;">
                \${days.map(d => \`<span class="team-tag date-tag" style="padding:2px 4px;font-size:0.7rem;">\${d}</span>\`).join('')}
                \${hours.map(h => \`<span class="team-tag hour-tag" style="padding:2px 4px;font-size:0.7rem;">\${h}</span>\`).join('')}
            </div>
            
            <!-- Top Right: Location -->
            <div style="grid-column: 2; grid-row: 1; text-align: right;">
                <span class="team-tag location-tag" style="padding:2px 6px; font-size:0.75rem;">\${s.location || 'FARK ETMEZ'}</span>
            </div>
            
            <!-- Bottom Left: Details -->
            <div style="grid-column: 1; grid-row: 2; font-size: 0.8rem; display: flex; flex-direction: column; gap: 4px;">
                <div style="font-weight:bold; color:var(--neon-green);">\${s.teamName}</div>
                <div style="font-size:0.75rem;">KAPTAN: \${s.captainName}</div>
                <div style="display:flex; gap:4px; margin-top:2px;">
                    <span class="team-tag size-tag" style="padding:2px 4px;font-size:0.7rem;">\${s.matchSize}</span>
                    <span class="team-tag age-tag" style="padding:2px 4px;font-size:0.7rem;">\${s.ageGroup}</span>
                </div>
                \${s.msg ? \`<div style="font-style:italic; font-size:0.75rem; margin-top:4px;">"\${s.msg.toLocaleUpperCase('tr-TR')}"</div>\` : ''}
            </div>
            
            <!-- Bottom Right: Buttons -->
            <div style="grid-column: 2; grid-row: 2; display: flex; flex-direction: column; justify-content: flex-end; align-items: flex-end; gap: 5px;">
                \${foundBadge}
                \${isOwner && s.status !== 'bulundu' ? '<button class="action-btn" style="padding:4px 12px;font-size:0.75rem;background:#f59e0b;color:#000;white-space:nowrap;border-radius:4px;border:none;cursor:pointer;" onclick="markTeamFound(' + s.id + ')">BULUNDU</button>' : ''}
            </div>
            
            <!-- Comments -->
            <div style="grid-column: 1 / -1; grid-row: 3; margin-top: 5px;">
                <div class="card-comments-toggle" style="font-size: 0.8rem; padding: 6px;" onclick="toggleForumComments('team_seeker', \${s.id})">ÝLETÝÞÝM / YORUMLAR</div>
                <div id="forum-comments-team_seeker-\${s.id}" style="display:none;margin-top:8px;border-top:1px solid rgba(255,255,255,0.1);padding-top:8px;">
                    <div id="forum-comments-list-team_seeker-\${s.id}" style="max-height:150px;overflow-y:auto;margin-bottom:8px;font-size:0.8rem;"></div>
                    <div style="display:flex;gap:5px;align-items:center;">
                        <input type="text" id="forum-comment-text-\${s.id}" class="form-control" style="flex:1; padding: 6px; font-size: 0.8rem;" placeholder="\${loggedInUser ? 'Buradan yazýlýr...' : 'Giriþ yapýn...'}" \${loggedInUser ? '' : 'disabled'}>
                        <button style="padding:4px 8px; font-size:0.7rem; font-weight:700; border:none; border-radius:4px; background:var(--primary-green); color:#000; cursor:pointer;" onclick="submitForumComment('team_seeker', \${s.id})" \${loggedInUser ? '' : 'disabled'}>GÖNDER</button>
                    </div>
                </div>
            </div>
        </div>
        \`;
    }).join('');`;

    content = content.replace(matches[0][0], matchSeekerRepl);
    content = content.replace(matches[1][0], teamSeekerRepl);
    fs.writeFileSync('script.js', content, 'utf8');
}
