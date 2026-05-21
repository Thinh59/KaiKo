import re

with open('frontend/src/components/Dashboard.jsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

settings1 = "".join(lines[1480:1505])
settings2 = "".join(lines[1906:1945])
daily_quests = "".join(lines[1217:1330])

with open('settings1.txt', 'w', encoding='utf-8') as f:
    f.write(settings1)

with open('settings2.txt', 'w', encoding='utf-8') as f:
    f.write(settings2)
    
with open('dailyquest.txt', 'w', encoding='utf-8') as f:
    f.write(daily_quests)

print("Extracted blocks")
