import json,time,secrets,os
from urllib.parse import urlparse
BASE_URL=os.environ.get("BROWSER_BASE_URL","http://127.0.0.1:3187")
assert urlparse(BASE_URL).hostname in ["localhost","127.0.0.1"],"Only local synthetic browser testing is permitted"
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
credentials=json.loads(Path('/tmp/hilal-overnight/browser-login.json').read_text())
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True)
 context=browser.new_context(ignore_https_errors=True,viewport={'width':1440,'height':960})
 page=context.new_page(); errors=[]
 page.on('pageerror',lambda error:errors.append(str(error)))
 page.on('response',lambda response:print('auth response',response.status) if '/api/auth/' in response.url else None)
 page.goto(BASE_URL+'/admin/login',wait_until='networkidle',timeout=60000)
 page.locator('#username').fill(credentials['email']);page.locator('#password').fill(credentials['password']);page.get_by_role('button',name='Daxil ol',exact=True).click()
 try: page.wait_for_url('**/account',timeout=60000)
 except Exception:
  print('Login alerts:',page.get_by_role('alert').all_text_contents(),'JS errors:',errors);page.screenshot(path='/tmp/hilal-overnight/login-failure.png');raise
 page.get_by_role('heading',name='İdarəetmə paneli',exact=True).wait_for()
 for route in ['exams','online-exams','questions','questions/verification','users','classes','companies','years','results','reports','seller-sales','migration']:
  page.goto(BASE_URL+'/account/'+route,wait_until='networkidle',timeout=60000)
  expect(page.locator('h1').first).to_be_visible()
  assert page.locator('body').evaluate('(el)=>el.scrollWidth<=window.innerWidth+1'),route+' desktop overflow'
 page.screenshot(path='/tmp/hilal-overnight/admin-desktop.png',full_page=True)
 # Create a real question through the existing dialog, then inspect server persistence.
 page.goto(BASE_URL+'/account/questions',wait_until='networkidle')
 page.get_by_role('button',name='Yeni Sual',exact=True).click()
 dialog=page.get_by_role('dialog');dialog.locator('#question-type').click();page.get_by_role('option',name='Doğru / Yanlış',exact=True).click()
 dialog.locator('#qtext').fill('Synthetic browser authored true false')
 dialog.get_by_role('radio',name='B variantı düzgündür',exact=True).click()
 dialog.get_by_role('button',name='Yadda Saxla',exact=True).click();expect(dialog).not_to_be_visible()
 state=context.request.get(BASE_URL+'/api/admin/state').json()
 authored=next(q for q in state['questions'] if q['text']=='Synthetic browser authored true false')
 assert authored['options']==['Doğru','Yanlış'] and authored['correct']==1
 # Create a registry year and publish an exam through the existing form.
 if not any(year['label']=='2026-2027' for year in state['years']):
  page.goto(BASE_URL+'/account/years',wait_until='networkidle');page.get_by_role('button',name='Yeni tədris ili',exact=True).click();year_dialog=page.get_by_role('dialog');year_dialog.locator('#registry-name').fill('2026-2027');year_dialog.get_by_role('button',name='Yadda saxla',exact=True).click();expect(year_dialog).not_to_be_visible()
 page.goto(BASE_URL+'/account/exams/new',wait_until='networkidle');page.locator('#title').fill('Synthetic browser authored exam');page.locator('#subject').fill('Math');page.locator('#academicYear').select_option('2026-2027');page.locator('#tickets').fill('EEEE-FFFF')
 page.locator('[id^="q-type-"]').first.click();page.get_by_role('option',name='Doğru / Yanlış',exact=True).click();page.locator('[id^="q-text-"]').first.fill('Synthetic authored exam question');page.get_by_text('Onlayn aktiv',exact=True).click();page.get_by_role('button',name='Yadda Saxla və Dərc Et',exact=True).click();page.wait_for_url('**/account/exams',timeout=30000)
 created_state=context.request.get(BASE_URL+'/api/admin/state').json();created_exam=next(e for e in created_state['exams'] if e['title']=='Synthetic browser authored exam');assert created_exam['onlineEnabled'] and created_exam['questions'][0]['options']==['Doğru','Yanlış']
 # Existing seller and revenue APIs operate on authoritative data and reject duplicates.
 sale=context.request.post(BASE_URL+'/api/tickets',data={'examId':created_exam['id'],'ticketCode':'EEEE-FFFF','studentFIN':'GHI9012','price':12.5});assert sale.status==200
 assert context.request.post(BASE_URL+'/api/tickets',data={'examId':created_exam['id'],'ticketCode':'EEEE-FFFF','studentFIN':'GHI9012','price':12.5}).status!=200
 report=context.request.get(BASE_URL+'/api/reports?examId='+created_exam['id']).json();assert report['report']['totalRevenue']==12.5
 # Secure staff setup runs through the real UI; no default password is used.
 page.goto(BASE_URL+'/account/users',wait_until='networkidle');page.get_by_role('button',name='Yeni istifadəçi',exact=True).click();staff_dialog=page.get_by_role('dialog');staff_dialog.locator('#name').fill('Synthetic enrollment staff');staff_dialog.locator('#email').fill('overnight-browser-enroll@test.invalid');staff_dialog.get_by_role('button',name='Yarat',exact=True).click();expect(staff_dialog).not_to_be_visible()
 setup_link=page.get_by_label('Şifrə qurulması keçidi',exact=True).input_value();staff=browser.new_context(ignore_https_errors=True);staff_page=staff.new_page();staff_page.goto(setup_link,wait_until='networkidle');new_password=secrets.token_urlsafe(24);staff_page.locator('#setup-password').fill(new_password);staff_page.locator('#setup-confirm').fill(new_password);staff_page.get_by_role('button',name='Şifrəni qur',exact=True).click();staff_page.get_by_text('Şifrə quruldu.',exact=False).wait_for()
 staff_page.goto(BASE_URL+'/admin/login',wait_until='networkidle');staff_page.locator('#username').fill('overnight-browser-enroll@test.invalid');staff_page.locator('#password').fill(new_password);staff_page.get_by_role('button',name='Daxil ol',exact=True).click();staff_page.wait_for_url('**/account/seller-sales',timeout=30000);assert staff.request.get(BASE_URL+'/api/users').status==403
 # Mobile admin route surfaces remain navigable without whole-page overflow.
 page.set_viewport_size({'width':390,'height':844})
 for route in ['exams','online-exams','questions','users','classes','results']:
  page.goto(BASE_URL+'/account/'+route,wait_until='networkidle');expect(page.locator('h1').first).to_be_visible();assert page.locator('body').evaluate('(el)=>el.scrollWidth<=window.innerWidth+1'),route+' mobile overflow'
 # A fresh student context must never receive administrative state or answer keys.
 student=browser.new_context(ignore_https_errors=True,viewport={'width':390,'height':844});student_page=student.new_page()
 student_page.goto(BASE_URL+'/',wait_until='networkidle')
 assert student_page.locator('body').evaluate('(el)=>el.scrollWidth<=window.innerWidth+1')
 if student_page.locator('#exam').count(): student_page.locator('#exam').select_option(credentials['examId'])
 student_page.locator('#fin').fill('abc1234');student_page.locator('#ticket').fill('aaaabbbb')
 with student_page.expect_response(lambda r:'/start' in r.url and r.request.method=='POST') as entry:
  student_page.get_by_role('button',name='İmtahana başla',exact=True).click()
 assert entry.value.status==200
 payload=entry.value.json();assert '"correct"' not in json.dumps(payload)
 student_page.wait_for_url('**/online-exam?attemptId=*',timeout=30000)
 student_page.get_by_text('Synthetic single question',exact=True).wait_for()
 student_page.screenshot(path='/tmp/hilal-overnight/student-mobile.png',full_page=True)
 assert student_page.locator('body').evaluate('(el)=>el.scrollWidth<=window.innerWidth+1')
 # Actual answer selection, autosave, reload, multiple-select and weighted submission.
 buttons=student_page.locator('section button[aria-pressed]')
 with student_page.expect_response(lambda r:'/answer' in r.url and r.request.post_data_json.get('answers')==[0,None,None]) as saved:
  buttons.nth(0).click()
 assert saved.value.status==200
 student_page.reload(wait_until='networkidle');student_page.get_by_text('Synthetic single question',exact=True).wait_for();expect(student_page.locator('section button[aria-pressed]').nth(0)).to_have_attribute('aria-pressed','true')
 student_page.get_by_role('button',name='Sonrakı →',exact=True).click();student_page.get_by_text('Synthetic multiple question',exact=True).wait_for()
 options=student_page.locator('section button[aria-pressed]')
 student.set_offline(True);options.nth(0).click();options.nth(2).click();student_page.get_by_text('Cavablar saxlanılmadı.',exact=False).wait_for()
 with student_page.expect_response(lambda r:'/answer' in r.url and r.request.post_data_json.get('answers')==[0,[0,2],None]) as saved:
  student.set_offline(False)
 assert saved.value.status==200
 student_page.get_by_role('button',name='Sonrakı →',exact=True).click();student_page.get_by_text('Synthetic true false question',exact=True).wait_for();
 with student_page.expect_response(lambda r:'/answer' in r.url and r.request.post_data_json.get('answers')==[0,[0,2],1]) as saved:
  student_page.locator('section button[aria-pressed]').nth(1).click()
 assert saved.value.status==200
 student_page.get_by_role('button',name='Bitir',exact=True).click();student_page.get_by_role('button',name='Təsdiq — yekunlaşdır',exact=True).click();student_page.wait_for_url('**/online-exam/result?token=*',timeout=30000)
 token=student_page.url.split('token=')[1].split('&')[0]
 result=student.request.get(BASE_URL+'/api/exams/result/result?token='+token).json();assert result['score']==100 and result['correctCount']==3
 assert '"correct"' not in json.dumps(result)
 assert student.request.get(BASE_URL+'/api/exams/result/result?token=wrong').status==404
 assert student.request.post(BASE_URL+'/api/exams/'+credentials['examId']+'/start',data={'fin':'DEF5678','ticket':'AAAA-BBBB'}).status!=200
 assert student.request.get(BASE_URL+'/api/admin/state').status==401
 # Archiving preserves the submitted result; admin result review is server-backed.
 archived=context.request.delete(BASE_URL+'/api/exams/'+credentials['examId']);assert archived.status==200
 assert student.request.get(BASE_URL+'/api/exams/result/result?token='+token).json()['score']==100
 page.goto(BASE_URL+'/account/results?examId='+credentials['examId'],wait_until='networkidle');expect(page.get_by_text('ABC1234',exact=True).first).to_be_visible()
 assert context.request.post(BASE_URL+'/api/auth/logout').status==200
 assert context.request.get(BASE_URL+'/api/admin/state').status==401
 assert not errors,errors
 print('Browser verified (exam publishing and sales/report API checks included): admin login; 12 desktop and 6 mobile admin routes; true/false authoring persisted; student single/multiple/true-false answers, autosave/refresh, weighted score 100, protected results, ticket reuse denial, offline recovery, archival/history and logout.')
 browser.close()
