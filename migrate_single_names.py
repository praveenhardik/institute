import re
import sqlite3

def clean_single_name(name, role, user_id):
    known = {
        1: ("Eleanor", "eleanor"),
        230: ("Admin", "admin"),
        3: ("Xavier", "xavier"),
        31: ("Alan", "alan"),
        32: ("Lovelace", "lovelace"),
        33: ("Alex", "alex"),
        34: ("Arthur", "arthur"),
        19: ("Admin3", "admin3"),
        20: ("Rogue", "rogue"),
        51: ("Student1", "student1"),
        54: ("HOD_CSE", "hod_cse"),
        55: ("Teacher_55", "teacher_55"),
        56: ("Student2", "student2"),
        80: ("Babbage", "babbage"),
        81: ("Ada", "ada"),
        82: ("Turing", "turing"),
        83: ("Short", "short")
    }
    if user_id in known:
        return known[user_id]
    
    # Check pattern with hash, e.g. "Super Admin c290a4"
    m_hash = re.search(r'([a-f0-9]{6})', name)
    if m_hash:
        h = m_hash.group(1)
        if 'super' in name.lower():
            return f"Super_{h}", f"super_{h}"
        elif 'admin' in name.lower():
            return f"Admin_{h}", f"admin_{h}"
        elif 'hod' in name.lower():
            return f"HOD_{h}", f"hod_{h}"
        elif 'teacher' in name.lower():
            return f"Teacher_{h}", f"teacher_{h}"
        elif 'student' in name.lower():
            return f"Student_{h}", f"student_{h}"

    if 'babbage' in name.lower():
        return "Babbage", "babbage"
    if 'ada' in name.lower():
        return "Ada", "ada"
    if 'turing' in name.lower():
        return "Turing", "turing"

    # Clean generic titles
    cleaned = re.sub(r'\(.*?\)', '', name).strip()
    cleaned = re.sub(r'^(Dr\.|Prof\.|Dean|Leader|Student|Super Admin|College Admin|Regional Admin|Doctor of Science|Professor of Philosophy)\s*', '', cleaned, flags=re.I).strip()
    tokens = cleaned.split()
    single = tokens[-1] if tokens else f"User_{user_id}"
    single = re.sub(r'[^A-Za-z0-9_]', '', single)
    return single or f"User_{user_id}", (single or f"User_{user_id}").lower()

def run_migration():
    conn = sqlite3.connect('database/database.db')
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    
    rows = cur.execute('SELECT id, name, username, email, role FROM users ORDER BY id').fetchall()
    print(f"Total users to migrate: {len(rows)}")
    
    seen_usernames = {}
    migrations = []
    
    for r in rows:
        uid = r['id']
        old_name = r['name']
        old_u = r['username']
        single_name, new_u = clean_single_name(old_name, r['role'], uid)
        
        final_u = new_u
        count = 1
        while final_u in seen_usernames and seen_usernames[final_u] != uid:
            count += 1
            final_u = f"{new_u}_{count}"
            
        seen_usernames[final_u] = uid
        if count > 1:
            single_name = f"{single_name}_{count}"
            
        # Determine email
        old_email = r['email'] or ""
        digits = re.sub(r'\D', '', old_email)
        num_suffix = "1"
        if digits:
            num_suffix = digits[-4:] if len(digits) >= 4 else digits
        
        new_email = f"{final_u.lower()}{num_suffix}@inpand.com"
        
        # Keep demo accounts' standard emails intact or clean
        if uid == 1:
            new_email = "eleanor1@inpand.com"
        elif uid == 230:
            new_email = "admin1@inpand.com"
        elif uid == 3:
            new_email = "xavier1@inpand.com"
        elif uid == 31:
            new_email = "alan1@inpand.com"
        elif uid == 32:
            new_email = "lovelace1@inpand.com"
        elif uid == 33:
            new_email = "alex1@inpand.com"
        elif uid == 34:
            new_email = "arthur1@inpand.com"
        
        migrations.append((uid, single_name, final_u, new_email, old_name, old_u))
        
    for uid, single_name, final_u, new_email, old_name, old_u in migrations:
        cur.execute(
            "UPDATE users SET name = ?, username = ?, email = ? WHERE id = ?",
            (single_name, final_u, new_email, uid)
        )
        print(f"Migrated ID {uid:2d}: '{old_name}' -> '{single_name}' | username: '{final_u}' | email: '{new_email}'")
        
    conn.commit()
    conn.close()
    print("Migration completed successfully!")

if __name__ == '__main__':
    run_migration()
