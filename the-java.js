(function(){
  var R = document.getElementById('lms-pp'); if(!R) return;
  var $ = function(id){ return document.getElementById(id); };
  var fmt = function(n){ return n.toLocaleString('en-US'); };

  /* ==========================================================================
     التسعير حسب الكمية (درجتين فقط):
     - 5 إلى 19 قطعة: 250 دج/قطعة
     - 20 قطعة فأكثر: 220 دج/قطعة + توصيل مجاني
     TODO(price): بدّلي الأرقام هنا إذا تغيّر السعر مستقبلاً.
  ========================================================================== */
  var PRICE_TIERS = [
    { min:20, price:220, freeDelivery:true },
    { min:0,  price:250, freeDelivery:false }
  ];

  function priceForPieces(pieces){
    for(var i=0;i<PRICE_TIERS.length;i++){ if(pieces >= PRICE_TIERS[i].min) return PRICE_TIERS[i]; }
    return PRICE_TIERS[PRICE_TIERS.length-1];
  }

  function makeBundle(k, pieces){
    var tier = priceForPieces(pieces);
    return {
      k:k, pieces:pieces,
      unitPrice:tier.price,
      price: tier.price * pieces,
      freeDelivery: tier.freeDelivery,
      label:'باقة ' + pieces + ' قطعة'
    };
  }

  /* الحد الأدنى 5 قطع — أكثر من 20 قطعة تتواصل معايا خاص بدل الموقع */
  var MIN_PIECES = 5, MAX_PIECES = 20;
  var BUNDLES = [];
  for (var qn = MIN_PIECES; qn <= MAX_PIECES; qn++) { BUNDLES.push(makeBundle('b' + qn, qn)); }

  var ALL_BUNDLES = BUNDLES;
  function findBundle(k){ for(var i=0;i<ALL_BUNDLES.length;i++){ if(ALL_BUNDLES[i].k === k) return ALL_BUNDLES[i]; } return null; }

  /* ==========================================================================
     قوائم الصور الخاصة بك
  ========================================================================== */
  var THUMB_SETS = [
    ['b1.jpeg', 'b2.jpeg'],
    ['a1.jpeg', 'a2.jpeg'],
    ['c1.jpeg', 'c2.jpeg', 'c3.jpeg'],
    ['d1.jpeg', 'd2.jpeg', 'd3.jpeg'],
    ['e1.jpeg', 'e2.jpeg'],
    ['f1.jpeg', 'f2.jpeg', 'f3.jpeg'],
    ['g1.jpeg', 'g2.jpeg'],
    ['h1.jpeg', 'h2.jpeg'],
    ['i1.jpeg', 'i2.jpeg', 'i3.jpeg'],
    ['j1.jpeg', 'j2.jpeg'],
    ['k1.jpeg', 'k2.jpeg'],
    ['L1.jpeg', 'L2.jpeg', 'L3.jpeg'],
    ['m1.jpeg', 'm2.jpeg'],
    ['n1.jpeg', 'n2.jpeg'],
    ['o1.jpeg', 'o2.jpeg'],
    ['p1.jpeg', 'p2.jpeg', 'p3.jpeg'],
    ['q1.jpeg', 'q2.jpeg'],
    ['r1.jpeg', 'r2.jpeg']
  ];

  var DETAIL_IMAGES = [
    { src: 'fitin.jpg', cap: 'مساحة واسعة' },
    { src: 'sew.jpg', cap: 'تفاصيل الإغلاق' },
    { src: 'anti.jpg', cap: 'الداخل والبطانة' }
    
  ];

  var state = { bundleKey:'b10', orderQty:1, activeThumbSet:0, activeThumbImg:0, colorQueue:[] };
  var stageSwiped = false; // set true right after a swipe/arrow-click so the lightbox click doesn't also fire

  /* ====== توليد أزرار اختيار الكمية (5 إلى 20، صغار) ====== */
  var qtyBox = $('pp-qty');
  BUNDLES.forEach(function(b){
    var el = document.createElement('button');
    el.type = 'button'; el.setAttribute('data-k', b.k);
    el.innerHTML = b.pieces + (b.freeDelivery ? '<span class="tag">220 دج</span>' : '');
    qtyBox.appendChild(el);
  });

  var miniBox = $('pp-mini');
  ALL_BUNDLES.forEach(function(b){
    var btn = document.createElement('button');
    btn.type = 'button'; btn.setAttribute('data-k', b.k); btn.textContent = b.pieces;
    miniBox.appendChild(btn);
  });

  /* ====== منطق طابور اختيار اللون (يُستعمل من صناديق الصور تحت) ====== */
  function colorCounts(){
    var counts = {};
    state.colorQueue.forEach(function(c){ counts[c] = (counts[c] || 0) + 1; });
    return counts;
  }

  /* يحدّث شكل صناديق الصور + نص الحالة + الحقل المخفي اللي يترسل مع الطلب */
  function renderColors(bumpLetter){
    var counts = colorCounts();
    document.querySelectorAll('#pp-thumbs .pp-thumb-box').forEach(function(box){
      var letter = box.getAttribute('data-c'), n = counts[letter] || 0;
      box.classList.toggle('picked', n > 0);
      var badge = box.querySelector('.pick');
      if(badge) badge.textContent = n;
      if(letter === bumpLetter){
        box.classList.add('bump');
        setTimeout(function(){ box.classList.remove('bump'); }, 320);
      }
    });
    var b = findBundle(state.bundleKey);
    var total = b ? b.pieces : 0, picked = state.colorQueue.length;
    var statusEl = $('pp-colors-status');
    if(statusEl){
      statusEl.textContent = picked + ' من ' + total + ' قطعة اخترتي لونها' +
        (picked < total ? ' — الباقي نبعتوه بتشكيلة عشوائية' : ' ✔');
    }
    $('pp-colors-summary').value = Object.keys(counts).map(function(k){ return k + ':' + counts[k]; }).join(',');
  }

  /* كل ضغطة على صندوق صورة = قطعة وحدة من هذا اللون تنضاف للطابور. إذا فاض
     الطابور على الكمية المختارة، أول قطعة تدخلت (الأقدم) تخرج — مش شرط تكون
     نفس اللون اللي ضغطت عليه هسا. هكذا تقدري تضغطي نفس الصندوق بزاف مرات. */
  function pickColor(letter){
    var b = findBundle(state.bundleKey); if(!b) return;
    state.colorQueue.push(letter);
    if(state.colorQueue.length > b.pieces){ state.colorQueue.shift(); }
    renderColors(letter);
  }

  function trimColorsToQuota(){
    var b = findBundle(state.bundleKey); if(!b) return;
    while(state.colorQueue.length > b.pieces){ state.colorQueue.shift(); }
    renderColors();
  }

  function selectBundle(k){
    var b = findBundle(k); if(!b) return;
    state.bundleKey = k;
    document.querySelectorAll('#pp-qty button').forEach(function(c){ c.classList.toggle('on', c.getAttribute('data-k') === k); });
    document.querySelectorAll('#pp-mini button').forEach(function(c){ c.classList.toggle('on', c.getAttribute('data-k') === k); });
    $('pp-bundle-size').value = b.pieces;
    $('pp-bundle-price').value = b.price;
    $('pp-chosen-name').textContent = b.label;
    $('pp-bd-name').textContent = b.label;
    $('pp-tag-price').textContent = fmt(b.price) + ' دج';
    $('pp-tag-note').textContent = b.label + (b.freeDelivery ? ' · توصيل مجاني 🎉' : '');
    trimColorsToQuota(); // ينقص الألوان الزايدة إذا نقصت الكمية، ويحدّث النص دايماً
    recalc();
  }

  $('pp-qty').addEventListener('click', function(e){ var c = e.target.closest('button'); if(c) selectBundle(c.getAttribute('data-k')); });
  $('pp-mini').addEventListener('click', function(e){ var b = e.target.closest('button'); if(b) selectBundle(b.getAttribute('data-k')); });

  /* ====== الصورة الكبيرة + الصناديق المصغرة (التنظيم الجديد) ====== */
  var stageImg = $('pp-stage-img'), dotsBox = $('pp-stage-dots'), thumbsBox = $('pp-thumbs');

  THUMB_SETS.forEach(function(imgs, i){
    var box = document.createElement('div');
    box.className = 'pp-thumb-box'; box.setAttribute('data-i', i); box.setAttribute('role','button'); box.setAttribute('tabindex','0');
    var letter = String.fromCharCode(65 + i); // A, B, C... حسب ترتيب THUMB_SETS
    box.setAttribute('data-c', letter);
    box.innerHTML = '<span class="num">' + letter + '</span><span class="pick">0</span>';

    // NEW RULE: Only inject the FIRST image into the small box to keep it clean.
    if(imgs.length > 0) {
      var img = document.createElement('img');
      img.src = imgs[0]; 
      img.alt = 'لون ' + letter; 
      img.loading = 'lazy'; 
      img.setAttribute('data-j', 0);
      box.appendChild(img);
    }
    if(imgs.length > 1){
      var countBadge = document.createElement('span');
      countBadge.className = 'count'; countBadge.textContent = imgs.length;
      box.appendChild(countBadge);
    }
    
    thumbsBox.appendChild(box);
  });

  function showStage(setIndex, imgIndex){
    var imgs = THUMB_SETS[setIndex]; if(!imgs) return;
    state.activeThumbSet = setIndex; state.activeThumbImg = imgIndex;
    stageImg.src = imgs[imgIndex];
    document.querySelectorAll('#pp-thumbs .pp-thumb-box').forEach(function(b){ b.classList.toggle('on', +b.getAttribute('data-i') === setIndex); });
    dotsBox.innerHTML = '';
    
    // Generate the small dots so clients know how many images are in this specific set
    imgs.forEach(function(src, j){
      var d = document.createElement('span');
      d.className = j === imgIndex ? 'on' : '';
      d.addEventListener('click', function(ev){ ev.stopPropagation(); showStage(setIndex, j); });
      dotsBox.appendChild(d);
    });
    
    // Only show dots if there is more than 1 image
    if(imgs.length > 1) {
      dotsBox.classList.add('show');
    } else {
      dotsBox.classList.remove('show');
    }
  }

  // When a user clicks a small box, show the first image of that set on the big stage
  // AND register one unit of that color in the pick queue.
  thumbsBox.addEventListener('click', function(e){
    var box = e.target.closest('.pp-thumb-box'); if(!box) return;
    var i = +box.getAttribute('data-i');
    showStage(i, 0);
    pickColor(box.getAttribute('data-c'));
  });

  // Moves the CURRENT set forward/back by dir (+1 next, -1 prev), wrapping around.
  // Shared by the arrow buttons and by swiping.
  function stageStep(dir){
    var currentSet = THUMB_SETS[state.activeThumbSet];
    if(!currentSet || currentSet.length <= 1) return;
    var maxImg = currentSet.length - 1;
    var next = state.activeThumbImg + dir;
    if(next > maxImg) next = 0;
    if(next < 0) next = maxImg;
    showStage(state.activeThumbSet, next);
  }

  var stagePrevBtn = $('pp-stage-prev'), stageNextBtn = $('pp-stage-next');
  // stopPropagation keeps these clicks from ever reaching the frame's own
  // click handler (the lightbox opener), so no extra guard is needed here.
  if(stagePrevBtn) stagePrevBtn.addEventListener('click', function(e){ e.stopPropagation(); stageStep(-1); });
  if(stageNextBtn) stageNextBtn.addEventListener('click', function(e){ e.stopPropagation(); stageStep(1); });

  /* ====== إضافة ميزة السحب (Swipe) للصورة الكبيرة ====== */
  var touchStartX = 0;
  var touchEndX = 0;
  var stageFrame = stageImg.parentNode; 

  stageFrame.addEventListener('touchstart', function(e) {
    touchStartX = e.changedTouches[0].screenX;
  }, {passive: true});

  stageFrame.addEventListener('touchend', function(e) {
    touchEndX = e.changedTouches[0].screenX;
    handleSwipe();
  }, {passive: true});

  function handleSwipe() {
    var swipeDist = touchStartX - touchEndX;
    if (Math.abs(swipeDist) <= 40) return; // too small to count as a swipe — let it become a normal tap
    stageSwiped = true; // this touchend will be followed by a synthetic click — suppress it below
    if (swipeDist > 40) {
      stageStep(1); // Swiped Left -> Next image
    } else {
      stageStep(-1); // Swiped Right -> Previous image
    }
  }

  /* ====== قسم التفاصيل ====== */
  var detailImg = $('pp-detail-img'), detailCap = $('pp-detail-cap'), detailThumbs = $('pp-detail-thumbs');
  
  var videoContainer = document.createElement('div');
  videoContainer.style.display = 'none';
  videoContainer.style.width = '100%';
  detailImg.parentNode.insertBefore(videoContainer, detailImg.nextSibling);

  DETAIL_IMAGES.forEach(function(d, i){
    var btn = document.createElement('button');
    btn.type = 'button'; btn.className = i === 0 ? 'on' : ''; btn.setAttribute('data-i', i);
    btn.innerHTML = '<img src="' + d.src + '" alt="' + d.cap + '" loading="lazy">';
    detailThumbs.appendChild(btn);
  });

  detailThumbs.addEventListener('click', function(e){
    var btn = e.target.closest('button'); if(!btn) return;
    var d = DETAIL_IMAGES[+btn.getAttribute('data-i')];
    
    if(d.html) {
      detailImg.style.display = 'none';
      videoContainer.innerHTML = d.html;
      videoContainer.style.display = 'block';
    } else {
      detailImg.src = d.src;
      detailImg.style.display = 'block';
      videoContainer.style.display = 'none';
      videoContainer.innerHTML = ''; 
    }
    
    detailCap.textContent = d.cap;
    document.querySelectorAll('#pp-detail-thumbs button').forEach(function(b){ b.classList.toggle('on', b === btn); });
  });

  /* ====== الولاية ⇐ البلدية ====== */
  var CITIES = {"DZ-01":["Adrar","Tamest","Reggane","Inozghmir","Tit","Tsabit","Zaouiet Kounta","Aoulef","Timokten","Tamentit","Fenoughil","Sali","Akabli","Ouled Ahmed Timmi","Bouda","Sbaa"],"DZ-02":["Chlef","Tenes","Benairia","El Karimia","Tadjna","Taougrite","Beni Haoua","Sobha","Harchoun","Ouled Fares","Sidi Akacha","Boukadir","Beni Rached","Talassa","Herenfa","Oued Goussine","Dahra","Ouled Abbes","Sendjas","Zeboudja","Oued Sly","Abou El Hassen","El Marsa","Chettia","Sidi Abderrahmane","Moussadek","El Hadjadj","Labiod Medjadja","Oued Fodda","Ouled Ben Abdelkader","Bouzghaia","Ain Merane","Oum Drou","Breira","Ben Boutaleb"],"DZ-03":["Laghouat","Ksar El Hirane","Benacer Ben Chohra","Sidi Makhlouf","Hassi Delaa","Hassi R Mel","Ain Mahdi","Tadjmout","Kheneg","Gueltat Sidi Saad","Ain Sidi Ali","Beidha","Brida","El Ghicha","Hadj Mechri","Sebgag","Taouiala","Tadjrouna","Aflou","El Assafia","Oued Morra","Oued M Zi","El Haouaita","Sidi Bouzid"],"DZ-04":["Oum El Bouaghi","Ain Beida","Ainmlila","Behir Chergui","El Amiria","Sigus","El Belala","Ain Babouche","Berriche","Ouled Hamla","Dhala","Ain Kercha","Hanchir Toumghani","El Djazia","Ain Diss","Fkirina","Souk Naamane","Zorg","El Fedjoudj Boughrar","Ouled Zouai","Bir Chouhada","Ksar Sbahi","Oued Nini","Meskiana","Ain Fekroune","Rahia","Ain Zitoun","Ouled Gacem","El Harmilia"],"DZ-05":["Batna","Ghassira","Maafa","Merouana","Seriana","Menaa","El Madher","Tazoult","Ngaous","Guigba","Inoughissen","Ouyoun El Assafir","Djerma","Bitam","Metkaouak","Arris","Kimmel","Tilatou","Ain Djasser","Ouled Selam","Tigherghar","Ain Yagout","Fesdis","Sefiane","Rahbat","Tighanimine","Lemsane","Ksar Belezma","Seggana","Ichmoul","Foum Toub","Beni Foudhala El Hakania","Oued El Ma","Talkhamt","Bouzina","Chemora","Oued Chaaba","Taxlent","Gosbat","Ouled Aouf","Boumagueur","Barika","Djezzar","Tkout","Ain Touta","Hidoussa","Teniet El Abed","Oued Taga","Ouled Fadel","Timgad","Ras El Aioun","Chir","Ouled Si Slimane","Zanat El Beida","Amdoukal","Ouled Ammar","El Hassi","Lazrou","Boumia","Boulhilat","Larbaa"],"DZ-06":["Bejaia","Amizour","Ferraoun","Taourirt Ighil","Chelata","Tamokra","Timzrit","Souk El Thenine","Mcisna","Thinabdher","Tichi","Semaoun","Kendira","Tifra","Ighram","Amalou","Ighil Ali","Ifelain Ilmathen","Toudja","Darguina","Sidi Ayad","Aokas","Beni Djellil","Adekar","Akbou","Seddouk","Tazmalt","Ait Rizine","Chemini","Souk Oufella","Taskriout","Tibane","Tala Hamza","Barbacha","Beni Ksila","Ouzallaguen","Bouhamza","Beni Melikeche","Sidi Aich","El Kseur","Melbou","Akfadou","Leflaye","Kherrata","Draa Kaid","Tamridjet","Ait Smail","Boukhelifa","Tizi Nberber","Beni Maouch","Oued Ghir","Boudjellil"],"DZ-07":["Biskra","Oumache","Branis","Chetma","Ras El Miaad","Sidi Okba","Mchouneche","El Haouch","Ain Naga","Zeribet El Oued","El Feidh","El Kantara","Ain Zaatout","El Outaya","Djemorah","Tolga","Lioua","Lichana","Ourlal","Mlili","Foughala","Bordj Ben Azzouz","Meziraa","Bouchagroun","Mekhadma","El Ghrous","El Hadjab","Khanguet Sidinadji"],"DZ-08":["Bechar","Erg Ferradj","Meridja","Lahmar","Mechraa Houari B","Kenedsa","Taghit","Boukais","Mogheul","Abadla","Beni Ounif"],"DZ-09":["Blida","Chebli","Bouinan","Oued El Alleug","Ouled Yaich","Chrea","El Affroun","Chiffa","Hammam Melouane","Ben Khlil","Soumaa","Mouzaia","Souhane","Meftah","Ouled Selama","Boufarik","Larbaa","Oued Djer","Beni Tamou","Bouarfa","Beni Mered","Bougara","Guerrouaou","Ain Romana","Djebabra"],"DZ-10":["Bouira","El Asnam","Guerrouma","Souk El Khemis","Kadiria","Hanif","Dirah","Ait Laaziz","Taghzout","Raouraoua","Mezdour","Haizer","Lakhdaria","Maala","El Hachimia","Aomar","Chorfa","Bordj Oukhriss","El Adjiba","El Hakimia","El Khebouzia","Ahl El Ksar","Bouderbala","Zbarbar","Ain El Hadjar","Djebahia","Aghbalou","Taguedit","Ain Turk","Saharidj","Dechmia","Ridane","Bechloul","Boukram","Ain Bessam","Bir Ghbalou","Mchedallah","Sour El Ghozlane","Maamora","Ouled Rached","Ain Laloui","Hadjera Zerga","Ath Mansour","El Mokrani","Oued El Berdi"],"DZ-11":["Tamanghasset","Abalessa","Idles","Tazouk","In Amguel"],"DZ-12":["Tebessa","Bir El Ater","Cheria","Stah Guentis","El Aouinet","Lahouidjbet","Safsaf El Ouesra","Hammamet","Negrine","Bir El Mokadem","El Kouif","Morsott","El Ogla","Bir Dheheb","El Ogla El Malha","Gorriguer","Bekkaria","Boukhadra","Ouenza","El Ma El Biodh","Oum Ali","Thlidjene","Ain Zerga","El Meridj","Boulhaf Dyr","Bedjene","El Mazeraa","Ferkane"],"DZ-13":["Tlemcen","Beni Mester","Ain Tallout","Remchi","El Fehoul","Sabra","Ghazaouet","Souani","Djebala","El Gor","Oued Chouly","Ain Fezza","Ouled Mimoun","Amieur","Ain Youcef","Zenata","Beni Snous","Bab El Assa","Dar Yaghmouracene","Fellaoucene","Azails","Sebbaa Chioukh","Terni Beni Hediel","Bensekrane","Ain Nehala","Hennaya","Maghnia","Hammam Boughrara","Souahlia","Msirda Fouaga","Ain Fetah","El Aricha","Souk Thlata","Sidi Abdelli","Sebdou","Beni Ouarsous","Sidi Medjahed","Beni Boussaid","Marsa Ben Mhidi","Nedroma","Sidi Djillali","Beni Bahdel","El Bouihi","Honaine","Tianet","Ouled Riyah","Bouhlou","Souk El Khemis","Ain Ghoraba","Chetouane","Mansourah","Beni Semiel","Ain Kebira"],"DZ-14":["Tiaret","Medroussa","Ain Bouchekif","Sidi Ali Mellal","Ain Zarit","Ain Deheb","Sidi Bakhti","Medrissa","Zmalet El Emir Aek","Madna","Sebt","Mellakou","Dahmouni","Rahouia","Mahdia","Sougueur","Sidi Abdelghani","Ain El Hadid","Ouled Djerad","Naima","Meghila","Guertoufa","Sidi Hosni","Djillali Ben Amar","Sebaine","Tousnina","Frenda","Ain Kermes","Ksar Chellala","Rechaiga","Nadorah","Tagdemt","Oued Lilli","Mechraa Safa","Hamadia","Chehaima","Takhemaret","Sidi Abderrahmane","Serghine","Bougara","Faidja","Tidda"],"DZ-15":["Tizi Ouzou","Ain El Hammam","Akbil","Freha","Souamaa","Mechtrass","Irdjen","Timizart","Makouda","Draa El Mizan","Tizi Ghenif","Bounouh","Ait Chaffaa","Frikat","Beni Aissi","Beni Zmenzer","Iferhounene","Azazga","Iloula Oumalou","Yakouren","Larba Nait Irathen","Tizi Rached","Zekri","Ouaguenoun","Ain Zaouia","Mkira","Ait Yahia","Ait Mahmoud","Maatka","Ait Boumehdi","Abi Youcef","Beni Douala","Illilten","Bouzguen","Ait Aggouacha","Ouadhia","Azzefoun","Tigzirt","Ait Aissa Mimoun","Boghni","Ifigha","Ait Oumalou","Tirmitine","Akerrou","Yatafen","Beni Ziki","Draa Ben Khedda","Ouacif","Idjeur","Mekla","Tizi Nthlata","Beni Yenni","Aghrib","Iflissen","Boudjima","Ait Yahia Moussa","Souk El Thenine","Ait Khelil","Sidi Naamane","Iboudraren","Aghni Goughran","Mizrana","Imsouhal","Tadmait","Ait Bouadou","Assi Youcef","Ait Toudert"],"DZ-16":["Alger Centre","Sidi Mhamed","El Madania","Hamma Anassers","Bab El Oued","Bologhine Ibn Ziri","Casbah","Oued Koriche","Bir Mourad Rais","El Biar","Bouzareah","Birkhadem","El Harrach","Baraki","Oued Smar","Bourouba","Hussein Dey","Kouba","Bachedjerah","Dar El Beida","Bab Azzouar","Ben Aknoun","Dely Ibrahim","Bains Romains","Rais Hamidou","Djasr Kasentina","El Mouradia","Hydra","Mohammadia","Bordj El Kiffan","El Magharia","Beni Messous","Les Eucalyptus","Birtouta","Tassala El Merdja","Ouled Chebel","Sidi Moussa","Ain Taya","Bordj El Bahri","Marsa","Haraoua","Rouiba","Reghaia","Ain Benian","Staoueli","Zeralda","Mahelma","Rahmania","Souidania","Cheraga","Ouled Fayet","El Achour","Draria","Douera","Baba Hassen","Khracia","Saoula"],"DZ-17":["Djelfa","Moudjebara","El Guedid","Hassi Bahbah","Ain Maabed","Sed Rahal","Feidh El Botma","Birine","Bouira Lahdeb","Zaccar","El Khemis","Sidi Baizid","Mliliha","El Idrissia","Douis","Hassi El Euch","Messaad","Guettara","Sidi Ladjel","Had Sahary","Guernini","Selmana","Ain Chouhada","Oum Laadham","Dar Chouikh","Charef","Beni Yacoub","Zaafrane","Deldoul","Ain El Ibel","Ain Oussera","Benhar","Hassi Fedoul","Amourah","Ain Fekka","Tadmit"],"DZ-18":["Jijel","Erraguene","El Aouana","Ziamma Mansouriah","Taher","Emir Abdelkader","Chekfa","Chahna","El Milia","Sidi Maarouf","Settara","El Ancer","Sidi Abdelaziz","Kaous","Ghebala","Bouraoui Belhadef","Djmila","Selma Benziada","Boussif Ouled Askeur","El Kennar Nouchfi","Ouled Yahia Khadrouch","Boudria Beni Yadjis","Kemir Oued Adjoul","Texena","Djemaa Beni Habibi","Bordj Taher","Ouled Rabah","Ouadjana"],"DZ-19":["Setif","Ain El Kebira","Beni Aziz","Ouled Sidi Ahmed","Boutaleb","Ain Roua","Draa Kebila","Bir El Arch","Beni Chebana","Ouled Tebben","Hamma","Maaouia","Ain Legraj","Ain Abessa","Dehamcha","Babor","Guidjel","Ain Lahdjar","Bousselam","El Eulma","Djemila","Beni Ouartilane","Rosfa","Ouled Addouane","Belaa","Ain Arnat","Amoucha","Ain Oulmane","Beidha Bordj","Bouandas","Bazer Sakhra","Hammam Essokhna","Mezloug","Bir Haddada","Serdj El Ghoul","Harbil","El Ouricia","Tizi Nbechar","Salah Bey","Ain Azal","Guenzet","Talaifacene","Bougaa","Beni Fouda","Tachouda","Beni Mouhli","Ouled Sabor","Guellal","Ain Sebt","Hammam Guergour","Ait Naoual Mezada","Ksar El Abtal","Beni Hocine","Ait Tizi","Maouklane","Guelta Zerka","Oued El Barad","Taya","El Ouldja","Tella"],"DZ-20":["Saida","Doui Thabet","Ain El Hadjar","Ouled Khaled","Moulay Larbi","Youb","Hounet","Sidi Amar","Sidi Boubekeur","El Hassasna","Maamora","Sidi Ahmed","Ain Sekhouna","Ouled Brahim","Tircine","Ain Soltane"],"DZ-21":["Skikda","Ain Zouit","El Hadaik","Azzaba","Djendel Saadi Mohamed","Ain Cherchar","Bekkouche Lakhdar","Benazouz","Es Sebt","Collo","Beni Zid","Kerkera","Ouled Attia","Oued Zehour","Zitouna","El Harrouch","Zerdazas","Ouled Hebaba","Sidi Mezghiche","Emdjez Edchich","Beni Oulbane","Ain Bouziane","Ramdane Djamel","Beni Bachir","Salah Bouchaour","Tamalous","Ain Kechra","Oum Toub","Bein El Ouiden","Fil Fila","Cheraia","Kanoua","El Ghedir","Bouchtata","Ouldja Boulbalout","Kheneg Mayoum","Hamadi Krouma","El Marsa"],"DZ-22":["Sidi Bel Abbes","Tessala","Sidi Brahim","Mostefa Ben Brahim","Telagh","Mezaourou","Boukhanafis","Sidi Ali Boussidi","Badredine El Mokrani","Marhoum","Tafissour","Amarnas","Tilmouni","Sidi Lahcene","Ain Thrid","Makedra","Tenira","Moulay Slissen","El Hacaiba","Hassi Zehana","Tabia","Merine","Ras El Ma","Ain Tindamine","Ain Kada","Mcid","Sidi Khaled","Ain El Berd","Sfissef","Ain Adden","Oued Taourira","Dhaya","Zerouala","Lamtar","Sidi Chaib","Sidi Dahou Dezairs","Oued Sbaa","Boudjebaa El Bordj","Sehala Thaoura","Sidi Yacoub","Sidi Hamadouche","Belarbi","Oued Sefioun","Teghalimet","Ben Badis","Sidi Ali Benyoub","Chetouane Belaila","Bir El Hammam","Taoudmout","Redjem Demouche","Benachiba Chelia","Hassi Dahou"],"DZ-23":["Annaba","Berrahel","El Hadjar","Eulma","El Bouni","Oued El Aneb","Cheurfa","Seraidi","Ain Berda","Chetaibi","Sidi Amer","Treat"],"DZ-24":["Guelma","Nechmaya","Bouati Mahmoud","Oued Zenati","Tamlouka","Oued Fragha","Ain Sandel","Ras El Agba","Dahouara","Belkhir","Ben Djarah","Bou Hamdane","Ain Makhlouf","Ain Ben Beida","Khezara","Beni Mezline","Bou Hachana","Guelaat Bou Sbaa","Hammam Maskhoutine","El Fedjoudj","Bordj Sabat","Hamman Nbail","Ain Larbi","Medjez Amar","Bouchegouf","Heliopolis","Ain Hessania","Roknia","Salaoua Announa","Medjez Sfa","Boumahra Ahmed","Ain Reggada","Oued Cheham","Djeballah Khemissi"],"DZ-25":["Constantine","Hamma Bouziane","El Haria","Zighoud Youcef","Didouche Mourad","El Khroub","Ain Abid","Beni Hamiden","Ouled Rahmoune","Ain Smara","Mesaoud Boudjeriou","Ibn Ziad"],"DZ-26":["Medea","Ouzera","Ouled Maaref","Ain Boucif","Aissaouia","Ouled Deide","El Omaria","Derrag","El Guelbelkebir","Bouaiche","Mezerena","Ouled Brahim","Damiat","Sidi Ziane","Tamesguida","El Hamdania","Kef Lakhdar","Chelalet El Adhaoura","Bouskene","Rebaia","Bouchrahil","Ouled Hellal","Tafraout","Baata","Boghar","Sidi Naamane","Ouled Bouachra","Sidi Zahar","Oued Harbil","Benchicao","Sidi Damed","Aziz","Souagui","Zoubiria","Ksar El Boukhari","El Azizia","Djouab","Chahbounia","Meghraoua","Cheniguel","Ain Ouksir","Oum El Djalil","Ouamri","Si Mahdjoub","Tlatet Eddoair","Beni Slimane","Berrouaghia","Seghouane","Meftaha","Mihoub","Boughezoul","Tablat","Deux Bassins","Draa Essamar","Sidi Errabia","Bir Ben Laabed","El Ouinet","Ouled Antar","Bouaichoune","Hannacha","Sedraia","Medjebar","Khams Djouamaa","Saneg"],"DZ-27":["Mostaganem","Sayada","Fornaka","Stidia","Ain Nouissy","Hassi Maameche","Ain Tadles","Sour","Oued El Kheir","Sidi Bellater","Kheiredine ","Sidi Ali","Abdelmalek Ramdane","Hadjadj","Nekmaria","Sidi Lakhdar","Achaacha","Khadra","Bouguirat","Sirat","Ain Sidi Cherif","Mesra","Mansourah","Souaflia","Ouled Boughalem","Ouled Maallah","Mezghrane","Ain Boudinar","Tazgait","Safsaf","Touahria","El Hassiane"],"DZ-28":["Msila","Maadid","Hammam Dhalaa","Ouled Derradj","Tarmount","Mtarfa","Khoubana","Mcif","Chellal","Ouled Madhi","Magra","Berhoum","Ain Khadra","Ouled Addi Guebala","Belaiba","Sidi Aissa","Ain El Hadjel","Sidi Hadjeres","Ouanougha","Bou Saada","Ouled Sidi Brahim","Sidi Ameur","Tamsa","Ben Srour","Ouled Slimane","El Houamed","El Hamel","Ouled Mansour","Maarif","Dehahna","Bouti Sayah","Khettouti Sed Djir","Zarzour","Oued Chair","Benzouh","Bir Foda","Ain Fares","Sidi Mhamed","Ouled Atia","Souamaa","Ain El Melh","Medjedel","Slim","Ain Errich","Beni Ilmane","Oultene","Djebel Messaad"],"DZ-29":["Mascara","Bou Hanifia","Tizi","Hacine","Maoussa","Teghennif","El Hachem","Sidi Kada","Zelmata","Oued El Abtal","Ain Ferah","Ghriss","Froha","Matemore","Makdha","Sidi Boussaid","El Bordj","Ain Fekan","Benian","Khalouia","El Menaouer","Oued Taria","Aouf","Ain Fares","Ain Frass","Sig","Oggaz","Alaimia","El Gaada","Zahana","Mohammadia","Sidi Abdelmoumene","Ferraguig","El Ghomri","Sedjerara","Moctadouz","Bou Henni","Guettena","El Mamounia","El Keurt","Gharrous","Gherdjoum","Chorfa","Ras Ain Amirouche","Nesmot","Sidi Abdeldjebar","Sehailia"],"DZ-30":["Ouargla","Ain Beida","Ngoussa","Hassi Messaoud","Rouissat","Sidi Khouiled","Hassi Ben Abdellah","El Borma"],"DZ-31":["Oran","Gdyel","Bir El Djir","Hassi Bounif","Es Senia","Arzew","Bethioua","Marsat El Hadjadj","Ain Turk","El Ancar","Oued Tlelat","Tafraoui","Sidi Chami","Boufatis","Mers El Kebir","Bousfer","El Karma","El Braya","Hassi Ben Okba","Ben Freha","Hassi Mefsoukh","Sidi Ben Yabka","Messerghin","Boutlelis","Ain Kerma","Ain Biya"],"DZ-32":["El Bayadh","Rogassa","Stitten","Brezina","Ghassoul","Boualem","El Abiodh Sidi Cheikh","Ain El Orak","Arbaouat","Bougtoub","El Kheither","Kef El Ahmar","Boussemghoun","Chellala","Krakda","El Bnoud","Cheguig","Sidi Ameur","El Mehara","Tousmouline","Sidi Slimane","Sidi Tifour"],"DZ-33":["Illizi","Debdeb","Bordj Omar Driss","In Amenas"],"DZ-34":["Bordj Bou Arreridj","Ras El Oued","Bordj Zemoura","Mansoura","El Mhir","Ben Daoud","El Achir","Ain Taghrout","Bordj Ghdir","Sidi Embarek","El Hamadia","Belimour","Medjana","Teniet En Nasr","Djaafra","El Main","Ouled Brahem","Ouled Dahmane","Hasnaoua","Khelil","Taglait","Ksour","Ouled Sidi Brahim","Tafreg","Colla","Tixter","El Ach","El Anseur","Tesmart","Ain Tesra","Bir Kasdali","Ghilassa","Rabta","Haraza"],"DZ-35":["Boumerdes","Boudouaou","Afir","Bordj Menaiel","Baghlia","Sidi Daoud","Naciria","Djinet","Isser","Zemmouri","Si Mustapha","Tidjelabine","Chabet El Ameur","Thenia","Timezrit","Corso","Ouled Moussa","Larbatache","Bouzegza Keddara","Taourga","Ouled Aissa","Ben Choud","Dellys","Ammal","Beni Amrane","Souk El Had","Boudouaou El Bahri","Ouled Hedadj","Laghata","Hammedi","Khemis El Khechna","El Kharrouba"],"DZ-36":["El Tarf","Bouhadjar","Ben Mhidi","Bougous","El Kala","Ain El Assel","El Aioun","Bouteldja","Souarekh","Berrihane","Lac Des Oiseaux","Chefia","Drean","Chihani","Chebaita Mokhtar","Besbes","Asfour","Echatt","Zerizer","Zitouna","Ain Kerma","Oued Zitoun","Hammam Beni Salah","Raml Souk"],"DZ-37":["Tindouf","Oum El Assel"],"DZ-38":["Tissemsilt","Bordj Bou Naama","Theniet El Had","Lazharia","Beni Chaib","Lardjem","Melaab","Sidi Lantri","Bordj El Emir Abdelkader","Layoune","Khemisti","Ouled Bessem","Ammari","Youssoufia","Sidi Boutouchent","Larbaa","Maasem","Sidi Abed","Tamalaht","Sidi Slimane","Boucaid","Beni Lahcene"],"DZ-39":["El Oued","Robbah","Oued El Alenda","Bayadha","Nakhla","Guemar","Kouinine","Reguiba","Hamraia","Taghzout","Debila","Hassani Abdelkrim","Hassi Khelifa","Taleb Larbi","Douar El Ma","Sidi Aoun","Trifaoui","Magrane","Beni Guecha","Ourmas","El Ogla","Mih Ouansa"],"DZ-40":["Khenchela","Mtoussa","Kais","Baghai","El Hamma","Ain Touila","Taouzianat","Bouhmama","El Oueldja","Remila","Cherchar","Djellal","Babar","Tamza","Ensigha","Ouled Rechache","El Mahmal","Msara","Yabous","Khirane","Chelia"],"DZ-41":["Souk Ahras","Sedrata","Hanancha","Mechroha","Ouled Driss","Tiffech","Zaarouria","Taoura","Drea","Haddada","Khedara","Merahna","Ouled Moumen","Bir Bouhouche","Mdaourouche","Oum El Adhaim","Ain Zana","Ain Soltane","Quillen","Sidi Fredj","Safel El Ouiden","Ragouba","Khemissa","Oued Keberit","Terraguelt","Zouabi"],"DZ-42":["Tipaza","Menaceur","Larhat","Douaouda","Bourkika","Khemisti","Aghabal","Hadjout","Sidi Amar","Gouraya","Nodor","Chaiba","Ain Tagourait","Cherchel","Damous","Meurad","Fouka","Bou Ismail","Ahmer El Ain","Bou Haroun","Sidi Ghiles","Messelmoun","Sidi Rached","Kolea","Attatba","Sidi Semiane","Beni Milleuk","Hadjerat Ennous"],"DZ-43":["Mila","Ferdjioua","Chelghoum Laid","Oued Athmenia","Ain Mellouk","Telerghma","Oued Seguen","Tadjenanet","Benyahia Abderrahmane","Oued Endja","Ahmed Rachedi","Ouled Khalouf","Tiberguent","Bouhatem","Rouached","Tessala Lamatai","Grarem Gouga","Sidi Merouane","Tassadane Haddada","Derradji Bousselah","Minar Zarza","Amira Arras","Terrai Bainen","Hamala","Ain Tine","El Mechira","Sidi Khelifa","Zeghaia","Elayadi Barbes","Ain Beida Harriche","Yahia Beniguecha","Chigara"],"DZ-44":["Ain Defla","Miliana","Boumedfaa","Khemis Miliana","Hammam Righa","Arib","Djelida","El Amra","Bourached","El Attaf","El Abadia","Djendel","Oued Chorfa","Ain Lechiakh","Oued Djemaa","Rouina","Zeddine","El Hassania","Bir Ouled Khelifa","Ain Soltane","Tarik Ibn Ziad","Bordj Emir Khaled","Ain Torki","Sidi Lakhdar","Ben Allal","Ain Benian","Hoceinia","Barbouche","Djemaa Ouled Chikh","Mekhatria","Bathia","Tachta Zegagha","Ain Bouyahia","El Maine","Tiberkanine","Belaas"],"DZ-45":["Naama","Mechria","Ain Sefra","Tiout","Sfissifa","Moghrar","Assela","Djeniane Bourzeg","Ain Ben Khelil","Makman Ben Amer","Kasdir","El Biod"],"DZ-46":["Ain Temouchent","Chaabet El Ham","Ain Kihal","Hammam Bouhadjar","Bou Zedjar","Oued Berkeche","Aghlal","Terga","Ain El Arbaa","Tamzoura","Chentouf","Sidi Ben Adda","Aoubellil","El Malah","Sidi Boumediene","Oued Sabah","Ouled Boudjemaa","Ain Tolba","El Amria","Hassi El Ghella","Hassasna","Ouled Kihal","Beni Saf","Sidi Safi","Oulhaca El Gheraba","Tadmaya","El Emir Abdelkader","El Messaid"],"DZ-47":["Ghardaia","Dhayet Bendhahoua","Berriane","Metlili","El Guerrara","El Atteuf","Zelfana","Sebseb","Bounoura","Mansoura"],"DZ-48":["Relizane","Oued Rhiou","Belaassel Bouzegza","Sidi Saada","Ouled Aiche","Sidi Lazreg","El Hamadna","Sidi Mhamed Ben Ali","Mediouna","Sidi Khettab","Ammi Moussa","Zemmoura","Beni Dergoun","Djidiouia","El Guettar","Hamri","El Matmar","Sidi Mhamed Ben Aouda","Ain Tarek","Oued Essalem","Ouarizane","Mazouna","Kalaa","Ain Rahma","Yellel","Oued El Djemaa","Ramka","Mendes","Lahlef","Beni Zentis","Souk El Haad","Dar Ben Abdellah","El Hassi","Had Echkalla","Bendaoud","El Ouldja","Merdja Sidi Abed","Ouled Sidi Mihoub"],"DZ-49":["Timimoun","Charouine","Ksar Kaddour","Ouled Said","Tinerkouk","Deldoul","Metarfa","Aougrout","Talmine","Ouled Aissa"],"DZ-50":["B Badji Mokhtar","Timiaouine"],"DZ-51":["Ouled Djellal","Sidi Khaled","Ras El Miad ","Besbes","Chaiba","Doucen"],"DZ-52":["Beni Abbes","Tamtert","Kerzaz","Timoudi","Beni Ikhlef","El Ouata","Tabelbala","Ouled Khoudir","Ksabi","Igli"],"DZ-53":["In Salah","In Ghar","Foggaret Azzaouia"],"DZ-54":["In Guezzam","Tinzaouatine"],"DZ-55":["Touggourt","Nezla","Tebesbest","Zaouia El Abidia","Temacine","Blidet Amor","Megarine","Mnaguer","Taibet","Benaceur","Sidi Slimane","El-hadjira","El Alia"],"DZ-56":["Djanet","Bordj El Haouasse"],"DZ-57":["El-mghair","Oum Touyour","Still","Sidi Khelil","Djamaa","Sidi Amrane","Tenedla","Mrara"],"DZ-58":["El Meniaa","Hassi Gara","Hassi Fehal"]};
  var wil = $('judecheckout_state'), city = $('judecheckout_city');

  wil.addEventListener('change', function(){
    var o = '<option value="">البلدية</option>';
    (CITIES[this.value] || []).forEach(function(n){ o += '<option value="' + n + '">' + n + '</option>'; });
    city.innerHTML = o;
    this.classList.remove('pp-e');
    recalc();
  });
  city.addEventListener('change', function(){ this.classList.remove('pp-e'); });

  /* ====== التوصيل ====== */
  var SHIP = {
    "DZ-01":[1000,600],"DZ-02":[700,400],"DZ-03":[800,500],"DZ-04":[700,400],"DZ-05":[700,400],
    "DZ-06":[700,400],"DZ-07":[800,500],"DZ-08":[1000,600],"DZ-09":[600,350],"DZ-10":[700,400],
    "DZ-11":[1200,800],"DZ-12":[800,500],"DZ-13":[800,450],"DZ-14":[700,400],"DZ-15":[700,400],
    "DZ-16":[500,300],"DZ-17":[700,400],"DZ-18":[700,400],"DZ-19":[700,400],"DZ-20":[800,450],
    "DZ-21":[700,400],"DZ-22":[800,450],"DZ-23":[700,400],"DZ-24":[700,400],"DZ-25":[700,400],
    "DZ-26":[700,400],"DZ-27":[700,400],"DZ-28":[800,450],"DZ-29":[800,450],"DZ-30":[1000,600],
    "DZ-31":[800,450],"DZ-32":[900,550],"DZ-33":[1200,800],"DZ-34":[700,400],"DZ-35":[600,350],
    "DZ-36":[700,400],"DZ-37":[1200,800],"DZ-38":[700,400],"DZ-39":[900,550],"DZ-40":[800,500],
    "DZ-41":[700,400],"DZ-42":[600,350],"DZ-43":[700,400],"DZ-44":[700,400],"DZ-45":[900,550],
    "DZ-46":[800,450],"DZ-47":[900,550],"DZ-48":[700,400],"DZ-49":[1100,700],"DZ-50":[1200,800],
    "DZ-51":[900,550],"DZ-52":[1000,600],"DZ-53":[1200,800],"DZ-54":[1200,800],"DZ-55":[900,550],
    "DZ-56":[1200,800],"DZ-57":[900,550],"DZ-58":[900,550]
  };
  var DEFAULT_SHIP = [800,500];

  document.querySelectorAll('#pp-ship button').forEach(function(b){
    b.addEventListener('click', function(){
      document.querySelectorAll('#pp-ship button').forEach(function(x){ x.classList.remove('on'); });
      this.classList.add('on');
      $('pp-delivery-method').value = this.getAttribute('data-delivery');
      recalc();
    });
  });

  function shipCost(){
    var b = findBundle(state.bundleKey);
    if(b && b.freeDelivery) return 0;
    if(!wil.value) return null;
    var p = SHIP[wil.value] || DEFAULT_SHIP;
    return $('pp-delivery-method').value === 'desk' ? p[1] : p[0];
  }

  /* ====== الحساب ====== */
  function recalc(){
    var b = findBundle(state.bundleKey); if(!b) return;
    var product = b.price * state.orderQty;
    var ship = shipCost();
    var pair = wil.value ? (SHIP[wil.value] || DEFAULT_SHIP) : null;

    if(b.freeDelivery){
      $('pp-ship-home').textContent = 'مجاني 🎉';
      $('pp-ship-desk').textContent = 'مجاني 🎉';
    } else {
      $('pp-ship-home').textContent = pair ? pair[0] + ' د.ج' : 'اختاري الولاية';
      $('pp-ship-desk').textContent = pair ? pair[1] + ' د.ج' : 'اختاري الولاية';
    }
    
    $('pp-bd-prod').textContent = fmt(product) + ' د.ج';
    var total;
    if(b.freeDelivery){ $('pp-bd-ship').textContent = 'مجاني 🎉'; total = product; }
    else if(ship === null){ $('pp-bd-ship').textContent = 'اختاري الولاية'; total = product; }
    else { $('pp-bd-ship').textContent = fmt(ship) + ' د.ج'; total = product + ship; }

    $('pp-bd-total').textContent = fmt(total) + ' د.ج';
    $('pp-chosen-price').textContent = fmt(product) + ' دج';
    $('pp-sticky-total').innerHTML = fmt(total) + ' دج<small>الدفع عند الاستلام</small>';

    $('pp-order-qty').value = state.orderQty;
    
  }

  /* ====== CTA + ripple + شريط ثابت ====== */
  function goOrder(){ $('pp-order').scrollIntoView({behavior:'smooth', block:'start'}); }
  $('pp-cta1').addEventListener('click', goOrder);
  $('pp-sticky-cta').addEventListener('click', goOrder);
  $('pp-cta2').addEventListener('click', function(){ $('pp-picks-sec').scrollIntoView({behavior:'smooth', block:'start'}); });

  document.querySelectorAll('#lms-pp .pp-btn').forEach(function(b){
    b.addEventListener('click', function(e){
      var r = document.createElement('span'); r.className = 'pp-rip';
      var rc = this.getBoundingClientRect(), s = Math.max(rc.width, rc.height);
      r.style.width = r.style.height = s + 'px';
      r.style.left = (e.clientX - rc.left - s/2) + 'px';
      r.style.top = (e.clientY - rc.top - s/2) + 'px';
      this.appendChild(r); setTimeout(function(){ r.remove(); }, 560);
    });
  });

  if('IntersectionObserver' in window){
    new IntersectionObserver(function(en){
      $('pp-sticky').classList.toggle('show', !en[0].isIntersecting);
    }, {threshold:0}).observe($('pp-submit'));
    var ro = new IntersectionObserver(function(en){
      en.forEach(function(x){ if(x.isIntersecting){ x.target.classList.add('in'); ro.unobserve(x.target); } });
    }, {threshold:.12});
    document.querySelectorAll('#lms-pp .rv').forEach(function(el){ ro.observe(el); });
  } else {
    document.querySelectorAll('#lms-pp .rv').forEach(function(el){ el.classList.add('in'); });
  }

  /* ====== الفقاعات ====== */
  (function bubbles(){
    if(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var box = $('pp-bubbles'), frag = document.createDocumentFragment();
    
    for(var i = 0; i < 45; i++){
      var b = document.createElement('i');
      var s = 12 + Math.random() * 50; 
      b.style.width = b.style.height = s.toFixed(0) + 'px';
      b.style.insetInlineStart = (Math.random() * 96).toFixed(1) + '%';
      
      b.style.animationDuration = (13 + Math.random() * 16).toFixed(1) + 's';
      b.style.animationDelay = (-Math.random() * 20).toFixed(1) + 's';
      b.style.opacity = (.55 + Math.random() * .45).toFixed(2);
      frag.appendChild(b);
    }
    box.appendChild(frag);
  })();

  /* ====== لايتبوكس (يفتح صورة المرحلة الكبيرة) ====== */
  R.querySelectorAll('.pp-frame').forEach(function(frame){
    frame.style.cursor = 'zoom-in';
    frame.addEventListener('click', function(e){
      if(e.target.closest('.pp-stage-nav')) return; // arrow click, not a zoom request
      if(stageSwiped){ stageSwiped = false; return; } // this click is the tail end of a swipe
      $('pp-lb-img').src = stageImg.src;
      $('pp-lb').classList.add('show');
    });
  });
  
  $('pp-detail').addEventListener('click', function(){
    if(detailImg.style.display === 'none') return; 
    $('pp-lb-img').src = detailImg.src;
    $('pp-lb').classList.add('show');
  });
  
  function closeLb(){ $('pp-lb').classList.remove('show'); }
  $('pp-lb-x').addEventListener('click', closeLb);
  $('pp-lb').addEventListener('click', function(e){ if(e.target === this) closeLb(); });
  document.addEventListener('keydown', function(e){ if(e.key === 'Escape') closeLb(); });

  /* ====== الإرسال ====== */
  function genEventId(){
    if(window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'lead_' + Date.now() + '_' + Math.random().toString(16).slice(2);
  }

  var form = $('pp-order-form'), submitBtn = $('pp-submit');
  form.addEventListener('submit', function(e){
    e.preventDefault();
    var msg = $('pp-msg'), bad = null;
    var name = $('pp-name'), phone = $('pp-phone');

    if($('pp-bundle-price').value === '0'){  }
    [name, phone].forEach(function(f){
      if(!f.value.trim() || (f.checkValidity && !f.checkValidity())){
        f.classList.add('pp-e');
        if(!bad){ bad = f; msg.textContent = (f === phone) ? 'أدخلي رقم هاتف صحيح من 10 أرقام يبدأ بـ 05 أو 06 أو 07.' : 'الرجاء كتابة الاسم بالكامل.'; }
      }
    });
    [wil, city].forEach(function(f){
      if(!f.value){ f.classList.add('pp-e'); if(!bad){ bad = f; msg.textContent = 'الرجاء اختيار الولاية والبلدية.'; } }
    });

    if(bad){
      msg.style.display = 'block';
      bad.scrollIntoView({behavior:'smooth', block:'center'});
      return;
    }
    msg.style.display = 'none';
    var wt = wil.options[wil.selectedIndex] ? wil.options[wil.selectedIndex].textContent : '';
    $('pp-full-address').value = [wt, city.value].filter(Boolean).join(' - ');

    var eventId = genEventId();
    $('pp-lead-event-id').value = eventId;

    function getCookie(name) {
      var match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
      return match ? match[2] : null;
    }

    var currentShipCost = shipCost();
    var productTotal = (+$('pp-bundle-price').value) * (+$('pp-order-qty').value);
    var finalTotal = currentShipCost === null ? productTotal : productTotal + currentShipCost;

    // Total number of pouch bags ordered (bundle pieces * quantity)
    var totalPieces = (+document.getElementById('pp-bundle-size').value) * (+document.getElementById('pp-order-qty').value);

    var payload = {
      pieces_count: totalPieces,
      full_name: name.value.trim(),
      phone_number: phone.value.trim(),
      wilaya_name: wt,
      commune: city.value,
      full_address: document.getElementById('pp-full-address').value,
      delivery_method: document.getElementById('pp-delivery-method').value,
      total_amount: finalTotal,
      lead_event_id: eventId,
      fbp: getCookie('_fbp'), 
      fbc: getCookie('_fbc')
    };

    if(window.fbq){ fbq('track', 'Lead', { content_name: 'bundle_' + payload.bundle_size, currency: 'DZD', value: payload.bundle_price }, { eventID: eventId }); }

    submitBtn.disabled = true; submitBtn.textContent = 'جاري الإرسال...';
    fetch('/api/order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(function(res){
      if(!res.ok) throw new Error('order failed');
      return res.json();
    }).then(function(){
      submitBtn.textContent = 'تم الإرسال ✔';
      msg.style.display = 'block'; msg.style.background = '#E6F7ED'; msg.style.color = '#1D7A46';
      msg.textContent = 'تم تسجيل طلبك، غادي نتصلو بيك للتأكيد.';
    }).catch(function(){
      submitBtn.disabled = false; submitBtn.textContent = 'تأكيد الطلب 🎀';
      msg.style.display = 'block'; msg.style.background = '#FFE4EC'; msg.style.color = '#B3245E';
      msg.textContent = 'صار خطأ فالإرسال. عاودي المحاولة أو تواصلي معنا مباشرة.';
    });
  });
  ['input','change'].forEach(function(ev){
    form.addEventListener(ev, function(e){ if(e.target && e.target.classList) e.target.classList.remove('pp-e'); });
  });

  /* ====== الحالة الابتدائية ====== */
  selectBundle('b10');
  showStage(0, 0);

  /* ====== العداد المباشر (Live Counter) ====== */
  (function initLiveCounter(){
    var countEl = $('pp-live-count');
    if(!countEl) return;
    
    var BASELINE = 2560; 
    var currentTotal = BASELINE;

    function updateCount(){
      fetch('/api/stats')
        .then(function(res){ return res.json(); })
        .then(function(data){
          if(data.count !== undefined){
            var newTotal = BASELINE + data.count;
            if(newTotal > currentTotal){
              currentTotal = newTotal;
              countEl.textContent = currentTotal;
              countEl.classList.add('pop');
              setTimeout(function(){ countEl.classList.remove('pop'); }, 600);
            }
          }
        })
        .catch(function(){}); 
    }

    updateCount(); 
    setInterval(updateCount, 10000); 
  })();
  
})();