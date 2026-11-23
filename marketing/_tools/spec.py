"""All videos: scenes, on-screen copy and narration. Copy stays inside marketing/BRIEF.md.

Scene kinds:
  intro  : hook card (logo + big line)          fields: head, say
  screen : wordmark + headline + sub + device  fields: img | clip, head, sub, say, device ('phone'|'laptop')
  outro  : tagline + CTA pill                   fields: head, cta, say
"""

A = 'app/'      # marketing/_src/app/*.png  (1080x1920)
W = 'web/'      # marketing/_src/web/*.png  (1920x1200)
C = 'clip:'     # marketing/_src/clips/<name>/

CTA = 'helpbharath.com'
OUTRO_SAY = 'help. Trusted professionals, right around you. Find yours at help bharath dot com.'


def intro(head, say):
    return {'kind': 'intro', 'head': head, 'say': say}


def scr(img, head, sub, say, device='phone'):
    return {'kind': 'screen', 'img': img, 'head': head, 'sub': sub, 'say': say, 'device': device}


def outro(head='Trusted professionals, right around you', say=OUTRO_SAY, cta=CTA):
    return {'kind': 'outro', 'head': head, 'cta': cta, 'say': say}


VIDEOS = [
    # ---------------- Instagram reels (9:16) ----------------
    {'id': 'reel-01-free-for-customers', 'dir': 'reels', 'fmt': 'v', 'scenes': [
        intro('Stop paying a middleman', 'Still paying extra just to find a plumber?'),
        scr(A + 'home', 'Free for customers', 'No commission. No middleman.', 'With help, finding a professional near you is free. No commission, no middleman.'),
        scr(A + 'results', 'Pros near you', 'Sorted by distance', 'See real professionals around you, with prices and ratings up front.'),
        scr(A + 'chat', 'Talk to them directly', 'Chat in the app', 'Then chat with them directly and agree on the job yourself.'),
        outro()]},
    {'id': 'reel-02-find-a-pro-fast', 'dir': 'reels', 'fmt': 'v', 'scenes': [
        intro('Need an electrician today?', 'Need an electrician today?'),
        scr(C + 'home-scroll', 'Pick what you need', '455 services in one app', 'Open help and pick what you need. There are four hundred and fifty five services.'),
        scr(A + 'category', 'Choose the exact job', 'Fan, switch, wiring and more', 'Choose the exact job, from fan repair to new wiring.'),
        scr(A + 'results', 'Closest pros first', 'With prices and ratings', 'The closest professionals show up first, with prices and ratings.'),
        outro()]},
    {'id': 'reel-03-know-who-is-coming', 'dir': 'reels', 'fmt': 'v', 'scenes': [
        intro('Know who is coming to your home', 'Do you really know who is coming to your home?'),
        scr(A + 'profile', 'Verified by help', 'Mobile, I D and qualifications', 'On help, profiles show what is verified: mobile number, I D and qualifications.'),
        scr(C + 'profile-scroll', 'Reviews you can trust', 'Only from people who chatted', 'Reviews come only from customers who actually chatted with the professional.'),
        outro()]},
    {'id': 'reel-04-chat-and-call', 'dir': 'reels', 'fmt': 'v', 'scenes': [
        intro('No more waiting for a call back', 'Tired of waiting for a call back?'),
        scr(A + 'profile', 'See if they are free', 'Available, busy or away', 'Every professional shows if they are available, busy or away right now.'),
        scr(A + 'messages', 'All your chats in one place', 'Reply when it suits you', 'Message them in the app and keep all your chats in one place.'),
        scr(A + 'chat', 'Or get their number', 'Copy it with one tap', 'Prefer a call? Sign in and copy their number with one tap.'),
        outro()]},
    {'id': 'reel-05-for-professionals', 'dir': 'reels', 'fmt': 'v', 'scenes': [
        intro('Get more customers nearby', 'Are you a plumber, tutor or beautician? Get found by customers near you.'),
        scr(A + 'welcome', 'Set up in minutes', 'Just three or four steps', 'Create your profile in just three or four steps.'),
        scr(A + 'pro-dashboard', 'Tell customers you are free', 'One tap: available, busy, away', 'Tell customers when you are free with one tap.'),
        scr(A + 'pro-subscription', 'From 199 rupees a month', 'No commission on your work', 'Plans start at one hundred and ninety nine rupees a month. No commission on your work.'),
        outro('Grow your business with help', 'help. Grow your business with customers right around you. Start at help bharath dot com.')]},
    {'id': 'reel-06-find-work', 'dir': 'reels', 'fmt': 'v', 'scenes': [
        intro('Looking for work near you?', 'Looking for work near you?'),
        scr(A + 'jobs', 'Jobs near you', 'Full-time, part-time or gig', 'help shows jobs posted by local professionals, full time, part time or one off.'),
        scr(A + 'job-detail', 'Apply directly', 'No fees, ever', 'See the pay and the area, and contact the employer directly. No fees.'),
        outro('Find work right around you', 'help. Find work right around you, at help bharath dot com.')]},

    # ---------------- YouTube Shorts (9:16) ----------------
    {'id': 'short-01-map-view', 'dir': 'shorts', 'fmt': 'v', 'scenes': [
        intro('See pros on a map', 'Want to see who is closest to you?'),
        scr(A + 'explore', 'List or map', 'Switch in one tap', 'Explore shows professionals as a list, or on a map.'),
        scr(A + 'results', 'Filter fast', 'Within 10 kilometres, available now, 4 stars and up', 'Filter by distance, who is available now, or four stars and up.'),
        outro()]},
    {'id': 'short-02-live-status', 'dir': 'shorts', 'fmt': 'v', 'scenes': [
        intro('Is your pro free right now?', 'Is your professional free right now?'),
        scr(A + 'pro-dashboard', 'Status in one tap', 'Available, busy or away', 'Professionals set their status in one tap, with a short note like back by six.'),
        scr(A + 'profile', 'Customers see it instantly', 'No guessing, no waiting', 'Customers see it on the profile, so nobody waits for nothing.'),
        outro()]},
    {'id': 'short-03-hire-helpers', 'dir': 'shorts', 'fmt': 'v', 'scenes': [
        intro('Need a helper for your work?', 'Busy professional? Need a helper?'),
        scr(A + 'pro-jobs', 'Post a job in minutes', 'Edit, pause or close any time', 'Post a job from your help account. Edit, pause or close it any time.'),
        scr(A + 'jobs', 'Seen by people nearby', 'They contact you directly', 'Job seekers nearby see it and contact you directly.'),
        outro()]},
    {'id': 'short-04-privacy', 'dir': 'shorts', 'fmt': 'v', 'scenes': [
        intro('Your privacy comes first', 'Worried about sharing your details online?'),
        scr(A + 'profile', 'No exact address shown', 'Only an approximate area', 'On help, exact addresses are never public. Only an approximate area.'),
        scr(A + 'customer-profile', 'You stay in control', 'Download or delete your data', 'You can download your data, or delete your account any time.'),
        outro()]},

    # ---------------- YouTube walkthroughs (16:9) ----------------
    {'id': 'yt-01-customer-walkthrough', 'dir': 'youtube', 'fmt': 'h', 'scenes': [
        intro('How to find a trusted pro near you', 'Here is how to find a trusted professional near you with help, in about two minutes.'),
        scr(A + 'home', 'Start on the home screen', 'Search or tap a popular service', 'Open the app. Search for what you need, or tap a popular service like electrician, plumber or A C repair.'),
        scr(A + 'services', '455 services, neatly grouped', 'Home, education, beauty, events and more', 'Everything is grouped, so it is easy to browse. There are four hundred and fifty five services.'),
        scr(A + 'category', 'Pick the exact job', 'See how many pros are near you', 'Pick the exact job, and see how many professionals are near you.'),
        scr(A + 'results', 'Compare at a glance', 'Distance, price, rating, experience', 'Results show distance, starting price, rating and years of experience. Use the filters for available now, or four stars and up.'),
        scr(A + 'explore', 'Prefer a map?', 'Switch between list and map', 'Prefer a map? Switch to map view and see who is closest.'),
        scr(C + 'profile-scroll', 'Read the full profile', 'Badges, services, hours and photos', 'Open a profile to see what is verified, their services and prices, working hours, work photos and reviews.'),
        scr(A + 'chat', 'Chat in the app', 'Agree on the job directly', 'Tap chat to message them directly. Agree on the time and price between you.'),
        scr(A + 'messages', 'All chats in one place', 'Never lose a conversation', 'All your chats stay in one place, and you get a notification when they reply.'),
        scr(A + 'customer-profile', 'Save, review and stay in control', 'Your account, your data', 'Save professionals you like, leave a review after you chat, and manage your account from your profile.'),
        outro()]},
    {'id': 'yt-02-professional-walkthrough', 'dir': 'youtube', 'fmt': 'h', 'scenes': [
        intro('Get more customers with help', 'If you are a professional, here is how help brings you customers from your neighbourhood.'),
        scr(A + 'welcome', 'Sign up in minutes', 'Phone, Google or email', 'Sign up with your phone, Google or email.'),
        scr(A + 'pro-profile', 'Build your profile', 'Photo, services, prices, hours', 'Add your photo, what you do, your prices, working hours and work photos. Customers see all of it.'),
        scr(C + 'pro-dashboard-scroll', 'Your dashboard', 'Set your status in one tap', 'Your dashboard lets you set your status in one tap, so customers know when you are free.'),
        scr(A + 'pro-messages', 'Customers message you', 'Reply from one inbox', 'Customers message you directly. Reply from one simple inbox.'),
        scr(A + 'pro-jobs', 'Hire helpers too', 'Post and manage jobs', 'Need a helper? Post a job and manage it right here.'),
        scr(A + 'pro-subscription', 'Simple plans', '199 rupees a month or 1,999 a year', 'Plans are simple: one hundred and ninety nine rupees a month, or one thousand nine hundred and ninety nine a year. No commission on your work.'),
        scr(W + 'web-pros', 'Also on the web', 'Your profile shows up on helpbharath.com', 'Your profile also appears on the help website, so people can find you on Google too.', 'laptop'),
        outro('Grow your business with help', 'help. Grow your business with customers right around you. Start at help bharath dot com.')]},
    {'id': 'yt-03-jobs-walkthrough', 'dir': 'youtube', 'fmt': 'h', 'scenes': [
        intro('Hire helpers. Find work. Both on help.', 'help is also a simple jobs board for your neighbourhood. Here is how it works.'),
        scr(A + 'pro-jobs', 'For professionals: post a job', 'Full-time, part-time or gig', 'Professionals can post a job in minutes: full time, part time or a one off gig.'),
        scr(A + 'jobs', 'For job seekers: jobs near you', 'Search and filter by type', 'Job seekers see jobs near them, and can search or filter by type.'),
        scr(A + 'job-detail', 'Everything on one page', 'Pay, openings, area and details', 'Each job shows the pay, the number of openings, the area and what the work involves.'),
        scr(W + 'web-home', 'Works on the website too', 'helpbharath.com', 'And it all works on the website too.', 'laptop'),
        outro('Find work right around you', 'help. Hire helpers and find work, right around you, at help bharath dot com.')]},
    {'id': 'yt-04-website-tour', 'dir': 'youtube', 'fmt': 'h', 'scenes': [
        intro('help on the web', 'No app? No problem. Here is help on the web.'),
        scr(W + 'web-home', 'Search from any browser', 'Same professionals as the app', 'Search from any browser and see the same professionals as in the app.'),
        scr(W + 'web-services', 'Browse every service', 'Grouped and easy to scan', 'Browse every service, grouped and easy to scan.'),
        scr(W + 'web-city', 'Pages for your city', 'Compare verified pros nearby', 'City pages help you compare verified professionals near you.'),
        scr(W + 'web-blog', 'Helpful guides', 'Hire well, stay safe', 'And our guides help you hire well and stay safe.'),
        outro()]},

    # ---------------- Flagship explainer (16:9, ~4-5 min) ----------------
    {'id': 'help-explainer', 'dir': 'overview-videos', 'fmt': 'h', 'scenes': [
        intro('Finding good local help should not be this hard', 'Your fan stops working on a Sunday. Your child needs a maths tutor before exams. Your function is next week and you still need a photographer.'),
        intro('Calls. Waiting. Guessing.', 'So you ask around. You call numbers from old visiting cards. Some never pick up. Some send someone you have never met. And you still do not know what it will cost.'),
        intro('The middleman takes a cut', 'And when you do use an app, a middleman often takes a cut from you and from the worker.'),
        intro('Meet help', 'Meet help. Trusted professionals, right around you.'),
        scr(A + 'home', 'Everything you need, nearby', 'Electricians, tutors, drivers and more', 'help is one simple app to find local professionals near you. Electricians, plumbers, tutors, beauticians, drivers, photographers and many more.'),
        scr(A + 'home', 'Free for customers', 'No commission, no middleman', 'For customers, it is completely free. There is no commission and no middleman. You deal with the professional directly.'),
        scr(A + 'services', '455 services', 'Neatly grouped, easy to find', 'There are four hundred and fifty five services, neatly grouped, so you find the right person fast.'),
        scr(A + 'category', 'Pick the exact job', 'And see who is near you', 'Pick the exact job you need, and see how many professionals are near you.'),
        scr(A + 'results', 'Closest first', 'Price, rating and experience up front', 'The closest professionals come first. You see their starting price, rating and years of experience before you contact anyone.'),
        scr(A + 'results', 'Filter in a tap', 'Available now, 4 stars and up', 'Need someone right now? Filter by available now. Want the best? Filter by four stars and up.'),
        scr(A + 'explore', 'Or see them on a map', 'Find who is closest', 'Or switch to the map and see exactly who is closest to you.'),
        scr(A + 'profile', 'Know who is coming', 'Verified mobile, I D and qualifications', 'Every profile shows what has been verified: mobile number, I D and qualifications. So you know who is coming to your home.'),
        scr(C + 'profile-scroll', 'Real reviews', 'Only from people who chatted', 'Reviews come only from customers who actually chatted with that professional, so they are real.'),
        scr(A + 'profile', 'Is your pro free right now?', 'Available, busy or away', 'Professionals show if they are available, busy or away, with a short note. No more calling and waiting.'),
        scr(A + 'chat', 'Chat in the app', 'Agree on time and price directly', 'Chat with them in the app. Agree on the time and price between yourselves.'),
        scr(A + 'messages', 'Or call them', 'Copy the number in one tap', 'Prefer to talk? Sign in and copy their number in one tap.'),
        scr(A + 'welcome', 'For professionals: get found', 'Set up in three or four steps', 'If you are a professional, help brings customers from your own neighbourhood. You can set up your profile in just three or four steps.'),
        scr(C + 'pro-dashboard-scroll', 'Your dashboard', 'Status, messages and insights', 'Your dashboard lets you set your status, reply to customers and see how many people viewed your profile.'),
        scr(A + 'pro-profile', 'A profile that sells for you', 'Services, prices, hours and photos', 'Show your services, prices, working hours and photos of your work. Your profile does the selling for you.'),
        scr(A + 'pro-subscription', 'Simple, fair plans', 'From 199 rupees a month', 'Plans start at one hundred and ninety nine rupees a month. You keep everything you earn. No commission.'),
        scr(A + 'pro-jobs', 'Need a helper? Post a job', 'Full-time, part-time or gig', 'Need a helper? Post a job right from your account.'),
        scr(A + 'jobs', 'Looking for work? It is here too', 'Jobs near you, no fees', 'And if you are looking for work, help shows jobs near you, with no fees.'),
        scr(W + 'web-home', 'On your phone and on the web', 'helpbharath.com', 'help works on your phone and on the web, so anyone can find you.', 'laptop'),
        scr(A + 'customer-profile', 'Your privacy, protected', 'No exact address, delete any time', 'Your privacy comes first. Exact addresses are never public, numbers are shown only to signed in users, and you can delete your account any time.'),
        intro('Good help, right around the corner', 'Good help is closer than you think. You just need a simple way to find it.'),
        outro()]},
]

# Full ~5-minute version of the flagship explainer, for someone who has never heard of help.
EXPLAINER = [
    intro('Finding good local help should not be this hard', 'Your fan stops working on a Sunday. Your child needs a maths tutor before exams. Your function is next week, and you still need a photographer.'),
    intro('Calls. Waiting. Guessing.', 'So you ask around. You call numbers from old visiting cards. Some never pick up. Some send someone you have never met. And you still do not know what it will cost.'),
    intro('And someone takes a cut', 'Even when you use an app, a middleman often takes a cut, from you and from the worker.'),
    intro('For professionals, it is just as hard', 'And if you are the electrician, the tutor or the beautician, it is just as hard. People two streets away do not even know you exist.'),
    intro('Meet help', 'Meet help. Trusted professionals, right around you.'),
    scr(A + 'home', 'One app for local help', 'Electricians, tutors, drivers and more', 'help is one simple app to find local professionals near you. Electricians, plumbers, tutors, beauticians, drivers, photographers, carpenters and many more.'),
    scr(A + 'home', 'Free for customers', 'No commission, no middleman', 'For customers, it is completely free. There is no commission and no middleman. You talk to the professional directly, and you agree on the price between you.'),
    intro('How it works: search, check, contact', 'It works in three simple steps. Search for what you need. Check who is right for you. Then contact them directly. Let us see each step.'),
    scr(A + 'welcome', 'Sign in your way', 'Phone, Google or email', 'You can browse without an account. When you are ready, sign in with your phone, your Google account or your email.'),
    scr(C + 'home-scroll', 'Step one: search', 'Or tap a popular service', 'Step one. Type what you need, or tap a popular service on the home screen, like electrician, plumber, A C repair or cleaning.'),
    scr(A + 'services', '455 services', 'Neatly grouped, easy to find', 'There are four hundred and fifty five services, grouped into home services, education, beauty, events, repairs and more. So you always find the right person.'),
    scr(A + 'category', 'Pick the exact job', 'And see who is near you', 'Pick the exact job, like fan repair or new wiring, and see how many professionals are near you right now.'),
    scr(A + 'results', 'Step two: check', 'Closest first, with prices and ratings', 'Step two. The closest professionals come first. You see their starting price, rating and years of experience before you contact anyone.'),
    scr(A + 'results', 'Filter in a tap', 'Within 10 km, available now, 4 stars and up', 'Need someone right now? Filter by available now. Want the best? Filter by four stars and up. You can also keep it within ten kilometres.'),
    scr(A + 'explore', 'Or see them on a map', 'Find who is closest', 'Prefer a map? Switch to map view and see exactly who is closest to you.'),
    scr(A + 'results', 'Compare and save', 'Shortlist the ones you like', 'Not sure yet? Compare professionals side by side, or save the ones you like and come back later.'),
    scr(A + 'profile', 'Know who is coming', 'Verified mobile, I D and qualifications', 'Open a profile to see what has been verified: mobile number, I D and qualifications. So you know who is coming to your home.'),
    scr(C + 'profile-scroll', 'Everything on one page', 'Services, prices, hours, photos', 'You also see their services and prices, their working hours, photos of their work, and the area they cover.'),
    scr(A + 'profile', 'Real reviews only', 'From people who actually chatted', 'Reviews come only from customers who actually chatted with that professional. So the stars you see are real.'),
    scr(A + 'profile', 'Is your pro free right now?', 'Available, busy or away', 'And every professional shows if they are available, busy or away, with a short note like, back by six. No more calling and waiting.'),
    scr(A + 'chat', 'Step three: contact', 'Chat in the app', 'Step three. Tap chat to message them in the app. Share what you need, and agree on a time and a price.'),
    scr(A + 'messages', 'Or call them', 'Copy the number in one tap', 'Prefer to talk? Sign in and copy their number in one tap. All your chats stay in one place, and you get a notification when they reply.'),
    scr(A + 'customer-profile', 'Help others choose', 'Leave a review after you chat', 'After the work is done, leave a review. It helps your neighbours choose well, and it helps good professionals grow.'),
    intro('Now, for professionals', 'Now, let us look at help from the other side. If you are a professional, help brings customers from your own neighbourhood.'),
    scr(A + 'welcome', 'Set up in minutes', 'Just three or four steps', 'Setting up takes just three or four short steps. Add your name, your photo and what you do.'),
    scr(A + 'pro-profile', 'A profile that sells for you', 'Services, prices, hours and photos', 'Then fill in your profile: your services and prices, your working hours, the area you cover, and photos of your work. You can add verification documents too, to earn trust badges.'),
    scr(C + 'pro-dashboard-scroll', 'Your dashboard', 'Status in one tap', 'Your dashboard lets you set your status in one tap. Available, busy or away, with quick notes like, on a job, back by six.'),
    scr(A + 'pro-messages', 'Customers come to you', 'Reply from one inbox', 'Customers message you directly. You reply from one simple inbox, and you can see how many people viewed your profile and asked for your number.'),
    scr(A + 'pro-subscription', 'Simple, fair plans', 'From 199 rupees a month', 'Creating your profile is free. To be listed in search, plans start at one hundred and ninety nine rupees a month. You keep everything you earn. No commission, ever.'),
    scr(A + 'pro-jobs', 'Need a helper? Post a job', 'Full-time, part-time or gig', 'Need an extra pair of hands? Post a job right from your account: full time, part time or a one off gig. Edit, pause or close it any time.'),
    scr(A + 'jobs', 'Looking for work? It is here too', 'Jobs near you, no fees', 'And if you are looking for work, help shows jobs posted by professionals near you.'),
    scr(A + 'job-detail', 'Apply directly', 'Pay, openings and area up front', 'Each job shows the pay, the area and what the work involves. You contact the employer directly, and there are no fees.'),
    scr(W + 'web-home', 'On your phone and on the web', 'helpbharath.com', 'help works on your phone and on the web. Anyone can search from a browser, and professional profiles can be found on Google too.', 'laptop'),
    scr(W + 'web-city', 'Pages for every city', 'Compare pros near you', 'The website has pages for each service in your city, so it is easy to compare verified professionals near you.', 'laptop'),
    scr(A + 'customer-profile', 'Your privacy, protected', 'No exact address, delete any time', 'Your privacy comes first. Exact addresses are never public. Phone numbers are shown only to signed in users. And you can download your data, or delete your account, any time.'),
    intro('help, in one line', 'So, to sum up. For customers, help is a free way to find trusted professionals nearby. For professionals, it is a fair way to get more local customers, with no commission. And for job seekers, it is work, right around the corner.'),
    outro(),
]
for _v in VIDEOS:
    if _v['id'] == 'help-explainer':
        _v['scenes'] = EXPLAINER

# Longer (1-minute-plus) versions of the jobs walkthrough and website tour.
_LONGER = {
    'yt-03-jobs-walkthrough': [
        intro('Hire helpers. Find work. Both on help.', 'help is also a simple jobs board for your neighbourhood. Here is how it works, for the people hiring and for the people looking for work.'),
        scr(A + 'pro-dashboard', 'Hiring starts in your account', 'Every professional can post jobs', 'If you are a professional on help, you can hire helpers right from your account.'),
        scr(A + 'pro-jobs', 'Post a job in minutes', 'Full-time, part-time or gig', 'Post a job in a few minutes. Choose full time, part time or a one off gig, and add the pay, the area and the number of openings.'),
        scr(A + 'pro-jobs', 'Stay in control', 'Edit, pause or close any time', 'Your job postings stay in one place. Edit, pause or close any of them, whenever you like.'),
        scr(A + 'jobs', 'For job seekers: jobs near you', 'Search and filter by type', 'Looking for work? Open the jobs tab to see work posted by professionals near you. Search, or filter by full time, part time or gig.'),
        scr(A + 'job-detail', 'Everything on one page', 'Pay, openings, area and details', 'Each job shows the pay, the number of openings, the area and what the work involves.'),
        scr(A + 'job-detail', 'Contact the employer directly', 'No fees, ever', 'When it looks right, contact the employer directly. There are no fees, and nobody in the middle.'),
        scr(W + 'web-home', 'Works on the website too', 'helpbharath.com', 'And it all works on the help website too, from any browser.'),
        outro('Find work right around you', 'help. Hire helpers and find work, right around you, at help bharath dot com.')],
    'yt-04-website-tour': [
        intro('help on the web', 'No app? No problem. Everything you can do in the help app, you can also do on the web. Here is a quick tour.'),
        scr(W + 'web-home', 'Search from any browser', 'Same professionals as the app', 'Open help bharath dot com from any browser. Search for a service and see the same professionals as in the app.'),
        scr(W + 'web-home', 'Free for customers', 'No commission, no middleman', 'Just like the app, it is free for customers, with no commission and no middleman.'),
        scr(W + 'web-services', 'Browse every service', '455 services, neatly grouped', 'Browse all four hundred and fifty five services, grouped and easy to scan.'),
        scr(W + 'web-city', 'Pages for your city', 'Compare verified pros nearby', 'Every service has a page for your city, so you can compare verified professionals near you, with prices and ratings.'),
        scr(W + 'web-pros', 'For professionals', 'Get found by customers nearby', 'Professionals can learn how help works, see the plans, and create a profile right from the website.'),
        scr(W + 'web-blog', 'Helpful guides', 'Hire well, stay safe', 'And our guides help you hire well, ask the right questions, and stay safe.'),
        outro()],
}
for _v in VIDEOS:
    if _v['id'] in _LONGER:
        _v['scenes'] = _LONGER[_v['id']]
