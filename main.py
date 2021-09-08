dnsCache  = list()
infoCache = list()

with open('probe-cache.log', 'r') as f:
    for i, text in enumerate(f):
        text = text.split(' -> ')[1][:-5]
        
        total, hit, miss = text.split('|')

        data = (total.replace('Total: ', '').strip(), hit.replace('Hits: ', '').strip(), miss.replace('Misses: ', '').strip())
        
        if (i%2==0): # dns cache
            dnsCache.append(data)
        else:        # stream info cache 
            infoCache.append(data)

with open('probe-cache-dns.csv', 'w') as f:
    for d in dnsCache:
        f.write(f'{d[0]},{d[1]},{d[2]}\n')

with open('probe-cache-info.csv', 'w') as f:
    for d in infoCache:
        f.write(f'{d[0]},{d[1]},{d[2]}\n')