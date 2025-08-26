import impmagic


class IsAlive():
	@impmagic.loader(
		{'module': 'sys'},
		{'module': 're','submodule': ['findall']},
		{'module': 'zpp_color','submodule': ['fg','attr']},
		{'module': 'requests','submodule': ['packages']}
	)
	def __init__(self, origin):
		self.org = origin
		self.stats = {"success": 0, "failed": 0, "failed_list": []}
		
		self.urls = []
		if "https://" not in origin:
			self.origin = "https://"+origin
		else:
			self.origin = origin

		self.stat_name = self.origin


	def run(self):
		rres = findall('://www.([\\w\\-\\.]+)',self.origin)
		if len(rres)==0:
			rres = findall('://([\\w\\-\\.]+)',self.origin)
		self.domain = rres[0]

		packages.urllib3.disable_warnings()

		self.get_link("/",self.origin)
		if "www." not in self.org:
			self.origin = self.origin.replace(self.domain,"www."+self.domain)
			self.get_link("/",self.origin)
		else:
			self.origin = self.origin.replace("www.","")
			self.get_link("/",self.origin)


	@impmagic.loader(
		{'module': 'bs4','submodule': ['BeautifulSoup']},
		{'module': 'zpp_color','submodule': ['fg','attr']},
		{'module': 'requests','submodule': ['get']}
	)
	def get_link(self, from_url, url):
		if url.startswith("http") and self.domain in url and url not in self.urls and "wp-content" not in url:
			self.urls.append(url)
			try:
				reqs = get(url, verify=False)

				if reqs.status_code==200:
					self.stats['success']+=1
					soup = BeautifulSoup(reqs.text, 'html.parser')
					
					for link in soup.find_all('a'):
						l = link.get('href')
						if l!=None:
							#if self.domain in l:
							if l.startswith(self.origin):
								self.get_link(url,l)
							elif l.startswith("/"):
								self.get_link(url,self.origin+l)
				else:
					if from_url!="/":
						self.stats['failed']+=1
						self.stats['failed_list'].append(f"{fg('dark_gray')}{from_url}{attr(0)} -> {fg('red')}{url}{attr(0)}")
			except:
				if from_url!="/":
					self.stats['failed']+=1
					self.stats['failed_list'].append(f"{fg('dark_gray')}{from_url}{attr(0)} -> {fg('red')}{url}{attr(0)}")
