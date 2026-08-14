(function(){
  var R = document.getElementById('lms-pp'); if(!R) return;
  var $ = function(id){ return document.getElementById(id); };
  var fmt = function(n){ return n.toLocaleString('en-US'); };

  /* ==========================================================================
     التسعير حسب الكمية (درجات):
       أقل من 10 قطع (يعني 5) → 280 دج للقطعة (بدون توصيل مجاني)
       10 إلى 19 قطعة  → 250 دج للقطعة (بدون توصيل مجاني)
       20 إلى 29 قطعة  → 220 دج للقطعة + توصيل مجاني
       30 إلى 49 قطعة  → 200 دج للقطعة + توصيل مجاني
       50 قطعة فما فوق → 190 دج للقطعة + توصيل مجاني
  ========================================================================== */
  var PRICE_TIERS = [
    { min:50, price:190, freeDelivery:true },
    { min:30, price:200, freeDelivery:true },
    { min:20, price:220, freeDelivery:true },
    { min:10, price:250, freeDelivery:false },
    { min:0,  price:280, freeDelivery:false }
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

  var BUNDLES = [5,10,20,30,40].map(function(n){ return makeBundle('b'+n, n); });
  var CUSTOM_STEPS = [50,60,70,80,90,100];
  var CUSTOM_BUNDLES = CUSTOM_STEPS.map(function(n){ return makeBundle('c'+n, n); });

  var ALL_BUNDLES = BUNDLES.concat(CUSTOM_BUNDLES);
  function findBundle(k){ for(var i=0;i<ALL_BUNDLES.length;i++){ if(ALL_BUNDLES[i].k === k) return ALL_BUNDLES[i]; } return null; }

  /* ==========================================================================
     TODO(images): 15 صندوق × 4 صور = 60 صورة. بدّلي المسارات بصورك الحقيقية.
     الصندوق رقم 1 يبدأ عليه الموقع بالـ default.
  ========================================================================== */
  var THUMB_SETS = [];
  for(var t=1;t<=15;t++){
    THUMB_SETS.push([
      'img/set-' + t + '-1.jpg',
      'img/set-' + t + '-2.jpg',
      'img/set-' + t + '-3.jpg',
      'img/set-' + t + '-4.jpg'
    ]);
  }

  // TODO(images): 4 صور قسم "شوفي التفاصيل"
  var DETAIL_IMAGES = [
    { src:'img/detail-1.jpg', cap:'تفاصيل القماش والخياطة' },
    { src:'img/detail-2.jpg', cap:'تفاصيل الإغلاق' },
    { src:'img/waterproof.jpeg', cap:'الداخل والبطانة' },
    { src:'img/detail-4.jpg', cap:'الأبعاد والحجم' }
  ];

  var state = { bundleKey:'b10', orderQty:1, activeThumbSet:0, activeThumbImg:0 };

  /* ====== توليد بطاقات الباقة الرئيسية (10/20/30/40) ====== */
  var picksBox = $('pp-picks');
  BUNDLES.forEach(function(b){
    var el = document.createElement('div');
    el.className = 'pp-pick'; el.setAttribute('data-k', b.k); el.setAttribute('role','button'); el.setAttribute('tabindex','0');
    el.innerHTML =
      '<div class="tick"><svg viewBox="0 0 12 12" fill="none"><path d="M2 6.5L4.8 9 10 3.5"/></svg></div>' +
      '<svg viewBox="0 0 48 48"><path d="M14 18v-4a10 10 0 0 1 20 0v4"/><rect x="9" y="18" width="30" height="22" rx="4"/></svg>' +
      '<b>' + b.pieces + ' قطعة</b>' +
      '<div class="pr">' + fmt(b.price) + ' دج</div>' +
      '<span class="note">' + fmt(b.unitPrice) + ' دج/قطعة' + (b.freeDelivery ? ' · توصيل مجاني 🎉' : '') + '</span>';
    picksBox.appendChild(el);
  });

  /* ====== توليد أزرار الكميات الأخرى (50-100) ====== */
  var moreBox = $('pp-bundles-more');
  CUSTOM_BUNDLES.forEach(function(b){
    var btn = document.createElement('button');
    btn.type = 'button'; btn.setAttribute('data-k', b.k);
    btn.textContent = b.pieces + ' قطعة — ' + fmt(b.price) + ' دج' + (b.freeDelivery ? ' 🚚 مجاني' : '');
    moreBox.appendChild(btn);
  });

  /* ====== توليد أزرار الفورم المصغّرة (كل الباقات) ====== */
  var miniBox = $('pp-mini');
  ALL_BUNDLES.forEach(function(b){
    var btn = document.createElement('button');
    btn.type = 'button'; btn.setAttribute('data-k', b.k); btn.textContent = b.pieces;
    miniBox.appendChild(btn);
  });

  function selectBundle(k){
    var b = findBundle(k); if(!b) return;
    state.bundleKey = k;
    document.querySelectorAll('#pp-picks .pp-pick').forEach(function(c){ c.classList.toggle('on', c.getAttribute('data-k') === k); });
    document.querySelectorAll('#pp-bundles-more button').forEach(function(c){ c.classList.toggle('on', c.getAttribute('data-k') === k); });
    document.querySelectorAll('#pp-mini button').forEach(function(c){ c.classList.toggle('on', c.getAttribute('data-k') === k); });
    $('pp-bundle-size').value = b.pieces;
    $('pp-bundle-price').value = b.price;
    $('pp-chosen-name').textContent = b.label;
    $('pp-bd-name').textContent = b.label;
    $('pp-tag-price').textContent = fmt(b.price) + ' دج';
    $('pp-tag-note').textContent = b.label + (b.freeDelivery ? ' · توصيل مجاني 🎉' : '');
    recalc();
  }

  $('pp-picks').addEventListener('click', function(e){ var c = e.target.closest('.pp-pick'); if(c) selectBundle(c.getAttribute('data-k')); });
  document.querySelectorAll('#pp-picks .pp-pick').forEach(function(c){
    c.addEventListener('keydown', function(e){ if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); c.click(); } });
  });
  $('pp-bundles-more').addEventListener('click', function(e){ var b = e.target.closest('button'); if(b) selectBundle(b.getAttribute('data-k')); });
  $('pp-mini').addEventListener('click', function(e){ var b = e.target.closest('button'); if(b) selectBundle(b.getAttribute('data-k')); });

  /* ====== الصورة الكبيرة + 15 صندوق مصغّر (4 صور لكل صندوق) ====== */
  var stageImg = $('pp-stage-img'), dotsBox = $('pp-stage-dots'), thumbsBox = $('pp-thumbs');

  THUMB_SETS.forEach(function(imgs, i){
    var box = document.createElement('div');
    box.className = 'pp-thumb-box'; box.setAttribute('data-i', i); box.setAttribute('role','button'); box.setAttribute('tabindex','0');
    box.innerHTML = '<span class="num">' + (i+1) + '</span>';
    imgs.forEach(function(src, j){
      var img = document.createElement('img');
      img.src = src; img.alt = 'صورة ' + (i+1) + '-' + (j+1); img.loading = 'lazy'; img.setAttribute('data-j', j);
      box.appendChild(img);
    });
    thumbsBox.appendChild(box);
  });

  function showStage(setIndex, imgIndex){
    var imgs = THUMB_SETS[setIndex]; if(!imgs) return;
    state.activeThumbSet = setIndex; state.activeThumbImg = imgIndex;
    stageImg.src = imgs[imgIndex];
    document.querySelectorAll('#pp-thumbs .pp-thumb-box').forEach(function(b){ b.classList.toggle('on', +b.getAttribute('data-i') === setIndex); });
    dotsBox.innerHTML = '';
    imgs.forEach(function(src, j){
      var d = document.createElement('span');
      d.className = j === imgIndex ? 'on' : '';
      d.addEventListener('click', function(ev){ ev.stopPropagation(); showStage(setIndex, j); });
      dotsBox.appendChild(d);
    });
    dotsBox.classList.add('show');
  }

  thumbsBox.addEventListener('click', function(e){
    var box = e.target.closest('.pp-thumb-box'); if(!box) return;
    var i = +box.getAttribute('data-i');
    // إذا ضغطت على صورة معيّنة داخل الصندوق، نبيّنها مباشرة؛ وإلا أول صورة فالصندوق
    var imgEl = e.target.closest('img');
    var j = imgEl ? +imgEl.getAttribute('data-j') : 0;
    showStage(i, j);
  });
  thumbsBox.addEventListener('keydown', function(e){
    var box = e.target.closest('.pp-thumb-box'); if(!box) return;
    if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); showStage(+box.getAttribute('data-i'), 0); }
  });

  /* ====== قسم التفاصيل: 4 صور تبدّل الصورة الكبيرة فالقسم ====== */
  var detailImg = $('pp-detail-img'), detailCap = $('pp-detail-cap'), detailThumbs = $('pp-detail-thumbs');
  DETAIL_IMAGES.forEach(function(d, i){
    var btn = document.createElement('button');
    btn.type = 'button'; btn.className = i === 0 ? 'on' : ''; btn.setAttribute('data-i', i);
    btn.innerHTML = '<img src="' + d.src + '" alt="' + d.cap + '" loading="lazy">';
    detailThumbs.appendChild(btn);
  });
  detailThumbs.addEventListener('click', function(e){
    var btn = e.target.closest('button'); if(!btn) return;
    var d = DETAIL_IMAGES[+btn.getAttribute('data-i')];
    detailImg.src = d.src; detailCap.textContent = d.cap;
    document.querySelectorAll('#pp-detail-thumbs button').forEach(function(b){ b.classList.toggle('on', b === btn); });
  });

  /* ====== الولاية ⇐ البلدية (بيانات الـ 58 ولاية — بلا تغيير) ====== */
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

  /* ====== التوصيل (بلا تغيير) ====== */
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

    $('pp-bd-prod').textContent = fmt(product) + ' د.ج' + (state.orderQty > 1 ? ' (×' + state.orderQty + ')' : '');
    var total;
    if(b.freeDelivery){ $('pp-bd-ship').textContent = 'مجاني 🎉'; total = product; }
    else if(ship === null){ $('pp-bd-ship').textContent = 'اختاري الولاية'; total = product; }
    else { $('pp-bd-ship').textContent = fmt(ship) + ' د.ج'; total = product + ship; }

    $('pp-bd-total').textContent = fmt(total) + ' د.ج';
    $('pp-chosen-price').textContent = fmt(product) + ' دج';
    $('pp-sticky-total').innerHTML = fmt(total) + ' دج<small>الدفع عند الاستلام</small>';

    $('pp-order-qty').value = state.orderQty;
    $('pp-qty-count').textContent = state.orderQty;
  }

  $('pp-qty-plus').addEventListener('click', function(){ state.orderQty = Math.min(state.orderQty+1,20); recalc(); });
  $('pp-qty-minus').addEventListener('click', function(){ state.orderQty = Math.max(state.orderQty-1,1); recalc(); });

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
    for(var i = 0; i < 16; i++){
      var b = document.createElement('i');
      var s = 10 + Math.random() * 46;
      b.style.width = b.style.height = s.toFixed(0) + 'px';
      b.style.insetInlineStart = (Math.random() * 96).toFixed(1) + '%';
      b.style.animationDuration = (13 + Math.random() * 16).toFixed(1) + 's';
      b.style.animationDelay = (-Math.random() * 20).toFixed(1) + 's';
      b.style.opacity = (.35 + Math.random() * .45).toFixed(2);
      frag.appendChild(b);
    }
    box.appendChild(frag);
  })();

  /* ====== لايتبوكس (يفتح صورة المرحلة الكبيرة) ====== */
  R.querySelectorAll('.pp-frame').forEach(function(frame){
    frame.style.cursor = 'zoom-in';
    frame.addEventListener('click', function(){
      $('pp-lb-img').src = stageImg.src;
      $('pp-lb').classList.add('show');
    });
  });
  $('pp-detail').addEventListener('click', function(){
    $('pp-lb-img').src = detailImg.src;
    $('pp-lb').classList.add('show');
  });
  function closeLb(){ $('pp-lb').classList.remove('show'); }
  $('pp-lb-x').addEventListener('click', closeLb);
  $('pp-lb').addEventListener('click', function(e){ if(e.target === this) closeLb(); });
  document.addEventListener('keydown', function(e){ if(e.key === 'Escape') closeLb(); });

  /* ==========================================================================
     TODO(backend): الإرسال. ما فماش ربط ووردبريس. نبعثو JSON إلى /api/order —
     دالة Cloudflare Pages Function خاصتك (راجعي functions/api/order.js).
     الفكرة (نفس نمط الـ PDF):
       1) نولدو lead_event_id واحد فالمتصفح، ونستعملوه فـ fbq('track','Lead', ..., {eventID: ...})
          حتى نقدرو نستعمل نفس الـ ID فـ CAPI السيرفر (Lead) للتطابق (dedup).
       2) نبعثو الطلب لـ /api/order، اللي يسجل الطلب فـ Supabase (status: pending)
          ويبعث Lead عبر CAPI بنفس الـ event_id.
       3) الـ Purchase الحقيقي يبعثه سيرفر Supabase (webhook) كي التاجر يبدّل الحالة
          لـ delivered_paid — event_id يكون deterministic: purchase_<id الصف> —
          هذا يخلي التكرار (retry) ما يزيدش بيع مزدوج فـ Meta Ads Manager.
  ========================================================================== */
  function genEventId(){
    if(window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'lead_' + Date.now() + '_' + Math.random().toString(16).slice(2);
  }

  var form = $('pp-order-form'), submitBtn = $('pp-submit');
  form.addEventListener('submit', function(e){
    e.preventDefault();
    var msg = $('pp-msg'), bad = null;
    var name = $('pp-name'), phone = $('pp-phone');

    if($('pp-bundle-price').value === '0'){ /* السعر ما تعبّاش بعد — تحذير فقط، ما يوقفش الفورم فالتطوير */ }
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

    // Calculate the final total (Product + Shipping) before sending
    // Helper function to grab cookies from the browser
    function getCookie(name) {
      var match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
      return match ? match[2] : null;
    }

    // Calculate the final total (Product + Shipping) before sending
    var currentShipCost = shipCost();
    var productTotal = (+$('pp-bundle-price').value) * (+$('pp-order-qty').value);
    var finalTotal = currentShipCost === null ? productTotal : productTotal + currentShipCost;

    var payload = {
      bundle_size: +$('pp-bundle-size').value,
      bundle_price: +$('pp-bundle-price').value,
      order_qty: +$('pp-order-qty').value,
      full_name: name.value.trim(),
      phone_number: phone.value.trim(),
      wilaya_code: wil.value,
      wilaya_name: wt,
      commune: city.value,
      full_address: $('pp-full-address').value,
      delivery_method: $('pp-delivery-method').value,
      lead_event_id: eventId,
      total_amount: finalTotal,
      fbp: getCookie('_fbp'), // <-- This grabs the Pixel cookie!
      fbc: getCookie('_fbc')  // <-- This grabs the Click cookie!
    };

    // TODO(pixel): بدّلي بقيم حقيقية كي يكون الـ Pixel جاهز
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
})();