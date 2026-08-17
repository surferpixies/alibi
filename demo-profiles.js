(() => {
  "use strict";
  const DAY = 86400000;
  const profiles = {
    marie: {
      id:"marie", name:"Marie", icon:"👩‍⚕️", age:34, scenario:"Produits laitiers",
      summary:"Horaires variables, repas rapides et inconforts digestifs qui diminuent après une réduction graduelle des produits laitiers.",
      color:"dairy"
    },
    alex: {
      id:"alex", name:"Alex", icon:"🏃", age:27, scenario:"Équilibre stable",
      summary:"Actif, régulier et varié. Ce profil vérifie que le Cerveau sait reconnaître la stabilité sans inventer de problème.",
      color:"balanced"
    },
    sophie: {
      id:"sophie", name:"Sophie", icon:"🌱", age:42, scenario:"Fibres et digestion",
      summary:"Télétravail, peu de fibres au départ, puis amélioration progressive de l’alimentation, de l’hydratation et du confort digestif.",
      color:"fiber"
    },
    elodie: {
      id:"elodie", name:"Élodie", icon:"🌿", age:31, scenario:"Soya et réactions cutanées",
      summary:"Trois mois d’observations globales montrent des réactions cutanées et parfois digestives qui reviennent davantage après des repas contenant du soya.",
      color:"soy"
    }
  };

  const referenceBrains = {
    marie: {
      story: {
        strength: "Tu cuisines davantage et tes repas sans produits laitiers sont devenus plus fréquents au fil des derniers mois.",
        habit: "Tu as progressivement remplacé plusieurs produits laitiers par des alternatives, surtout au déjeuner et dans tes collations.",
        suggestion: "Continue cette transition encore quelques semaines et observe si la diminution récente des inconforts digestifs se maintient."
      },
      feelings: {
        negative: [
          {id:"bloating",group:"symptom",label:"Ballonnements",emoji:"🫃",count:31,trend:"down",summary:"Ils apparaissent surtout après certains repas riches en produits laitiers.",occurrences:[]},
          {id:"gas",group:"symptom",label:"Gaz",emoji:"💨",count:26,trend:"down",summary:"Les épisodes diminuent à mesure que les produits laitiers deviennent moins fréquents.",occurrences:[]},
          {id:"stomachache",group:"symptom",label:"Douleurs ou crampes abdominales",emoji:"😖",count:18,trend:"down",summary:"Elles accompagnent parfois les ballonnements et les gargouillis après le repas.",occurrences:[]},
          {id:"diarrhea",group:"symptom",label:"Selles molles ou diarrhée",emoji:"💩",count:13,trend:"down",summary:"Ce symptôme est moins fréquent, mais revient dans certains épisodes digestifs.",occurrences:[]},
          {id:"nausea",group:"symptom",label:"Nausées",emoji:"🤢",count:8,trend:"down",summary:"Elles sont occasionnelles et surtout notées avec un ventre très gonflé ou tendu.",occurrences:[]},
          {id:"fatigue",group:"symptom",label:"Fatigue après le repas",emoji:"🥴",count:11,trend:"stable",summary:"Elle est parfois notée avec l’inconfort digestif, mais peut aussi être liée aux quarts tardifs.",occurrences:[]},
          {id:"headache",group:"symptom",label:"Maux de tête",emoji:"🤕",count:4,trend:"stable",summary:"Mention occasionnelle et moins spécifique; le journal ne permet pas d’en tirer une conclusion.",occurrences:[]}
        ],
        positive: [
          {id:"feeling_good",group:"neutral",label:"Rien de particulier",emoji:"👌",count:62,trend:"up",summary:"Les repas sans inconfort particulier deviennent plus fréquents depuis la réduction des produits laitiers.",occurrences:[]}
        ]
      },
      observations: [
        {id:"marie-dairy-digestion",icon:"🥛",title:"Produits laitiers et inconfort digestif",text:"Les journées contenant plusieurs produits laitiers sont plus souvent associées à des ballonnements, des gaz ou des crampes abdominales dans ce journal.",statistic:"2.5",comparisonStatistic:"3.7",samples:{exposed:52,comparison:113,total:165},metrics:{strength:"strong"},confidence:{icon:"🌳",label:"Très forte tendance",cls:"high"},basis:"52 journées avec produits laitiers ont été comparées à 113 journées sans cette exposition. Les inconforts digestifs apparaissent plus souvent dans le premier groupe."},
        {id:"marie-water-energy",icon:"💧",title:"Hydratation et meilleure énergie",text:"Les journées où l’hydratation atteint au moins six verres sont généralement accompagnées d’une meilleure énergie.",statistic:"3.8",comparisonStatistic:"2.9",samples:{exposed:74,comparison:91,total:165},metrics:{strength:"moderate"},confidence:{icon:"🌿",label:"Bonne tendance",cls:"medium"},basis:"L’énergie moyenne de 74 journées mieux hydratées a été comparée à celle de 91 journées moins hydratées."}
      ],
      insights: [
        {icon:"📉",title:"Les inconforts digestifs diminuent",text:"Les épisodes de ballonnements, gaz ou crampes sont passés d’environ sept par mois au début du journal à deux durant chacun des deux derniers mois.",confidence:{label:"Élevée",cls:"high"},basis:"Comparaison des six périodes mensuelles du profil.",kind:"reference"},
        {icon:"🏠",title:"Davantage de repas maison",text:"Les bols de riz, soupes, poissons et légumes remplacent progressivement plusieurs repas rapides du début.",confidence:{label:"Élevée",cls:"high"},basis:"Évolution des descriptions de repas sur 180 jours.",kind:"reference"}
      ]
    },
    alex: {
      story: {
        strength: "Ton alimentation est variée et tes routines de sommeil, d’hydratation et d’activité demeurent très régulières.",
        habit: "Les repas principaux contiennent presque toujours une source de protéines, des légumes et un féculent rassasiant.",
        suggestion: "Continue simplement à documenter les changements inhabituels; aucune priorité particulière ne ressort actuellement."
      },
      feelings: {
        negative: [],
        positive: [
          {id:"feeling_good",group:"neutral",label:"Rien de particulier",emoji:"👌",count:145,trend:"stable",summary:"Les repas sans ressenti particulier demeurent fréquents et stables pendant toute la période.",occurrences:[]}
        ]
      },
      observations: [],
      insights: [
        {icon:"⚖️",title:"Un profil remarquablement stable",text:"Aucun aliment ou contexte ne présente une association négative assez répétée pour devenir une tendance.",confidence:{label:"Élevée",cls:"high"},basis:"Analyse de 170 journées documentées.",kind:"reference"},
        {icon:"🏃",title:"Activité et ressenti positif",text:"Les journées actives contiennent plus souvent une mention de bonne humeur ou d’énergie élevée.",confidence:{label:"Moyenne",cls:"medium"},basis:"Comparaison des journées avec et sans activité documentée.",kind:"reference"}
      ]
    },
    sophie: {
      story: {
        strength: "Ton hydratation et la place des fibres se sont améliorées de façon régulière pendant les six derniers mois.",
        habit: "Le gruau, les légumineuses, les fruits et les légumes sont devenus des choix habituels plutôt qu’occasionnels.",
        suggestion: "Maintiens l’augmentation graduelle des fibres avec une bonne hydratation afin de préserver le confort observé récemment."
      },
      feelings: {
        negative: [
          {id:"bloating",group:"symptom",label:"Ballonnements",emoji:"🫧",count:31,trend:"down",summary:"Ils étaient fréquents au début, mais deviennent rares dans les dernières semaines.",occurrences:[]},
          {id:"stomachache",group:"symptom",label:"Mal de ventre",emoji:"🤢",count:19,trend:"down",summary:"Les épisodes diminuent à mesure que l’hydratation et les fibres deviennent plus régulières.",occurrences:[]}
        ],
        positive: [
          {id:"feeling_good",group:"neutral",label:"Rien de particulier",emoji:"👌",count:68,trend:"up",summary:"Les repas sans inconfort particulier deviennent plus fréquents avec la nouvelle routine alimentaire.",occurrences:[]}
        ]
      },
      observations: [
        {id:"sophie-fiber-energy",icon:"🌾",title:"Fibres et meilleure énergie",text:"Les journées comprenant du gruau, des légumineuses ou plusieurs légumes sont associées à une meilleure énergie.",statistic:"3.9",comparisonStatistic:"2.7",samples:{exposed:88,comparison:81,total:169},metrics:{strength:"strong"},confidence:{icon:"🌳",label:"Très forte tendance",cls:"high"},basis:"88 journées riches en fibres ont été comparées à 81 journées où ces aliments apparaissent peu."},
        {id:"sophie-water-digestion",icon:"💧",title:"Hydratation et confort digestif",text:"Une hydratation plus régulière accompagne la diminution des ballonnements et des maux de ventre.",statistic:"3.8",comparisonStatistic:"2.8",samples:{exposed:93,comparison:76,total:169},metrics:{strength:"moderate"},confidence:{icon:"🌿",label:"Bonne tendance",cls:"medium"},basis:"Les journées atteignant au moins six verres ont été comparées aux journées moins hydratées."}
      ],
      insights: [
        {icon:"📉",title:"Les inconforts diminuent",text:"Les ballonnements et maux de ventre sont beaucoup moins fréquents durant les huit dernières semaines qu’au début du journal.",confidence:{label:"Élevée",cls:"high"},basis:"Comparaison du début et de la fin de la période de 180 jours.",kind:"reference"},
        {icon:"🥣",title:"Une nouvelle routine est installée",text:"Le gruau, les fruits, les graines et les légumineuses apparaissent maintenant plusieurs fois par semaine.",confidence:{label:"Élevée",cls:"high"},basis:"Fréquence des aliments riches en fibres par période mensuelle.",kind:"reference"}
      ]
    },
    elodie: {
      story: {
        strength:"Tu notes les réactions qui apparaissent hors des repas, parfois le soir ou le lendemain, sans les attribuer automatiquement au dernier aliment mangé.",
        habit:"Les poussées de démangeaisons, rougeurs ou eczéma sont plus fréquentes dans les 24 à 48 heures suivant une journée contenant du tofu, de l’edamame, du miso ou une boisson de soya.",
        suggestion:"Présente ce journal à un professionnel de la santé avant de conclure à une allergie ou de modifier davantage ton alimentation. Une difficulté à respirer ou un gonflement de la gorge exige une aide urgente."
      },
      feelings: {
        negative:[
          {id:"itching",group:"symptom",label:"Démangeaisons ou rougeurs",emoji:"🤚",count:34,trend:"down",summary:"Elles sont surtout consignées dans les observations globales, souvent plusieurs heures après une exposition possible.",occurrences:[]},
          {id:"hives",group:"symptom",label:"Urticaire",emoji:"🟥",count:8,trend:"down",summary:"Des plaques rouges qui démangent sont notées à quelques reprises, sans réaction grave simulée.",occurrences:[]},
          {id:"nausea",group:"symptom",label:"Nausées ou inconfort digestif",emoji:"🤢",count:6,trend:"stable",summary:"Ces signes sont moins fréquents que les manifestations cutanées.",occurrences:[]}
        ],
        positive:[
          {id:"feeling_good",group:"neutral",label:"Rien de particulier",emoji:"👌",count:24,trend:"up",summary:"Les journées sans réaction particulière deviennent plus fréquentes durant le dernier mois.",occurrences:[]}
        ]
      },
      observations:[
        {id:"elodie-soy-skin",icon:"🌿",title:"Soya et réactions cutanées retardées",text:"Les observations globales de démangeaisons, rougeurs, urticaire ou poussée d’eczéma apparaissent plus souvent dans les 48 heures suivant une journée contenant du soya.",statistic:"2.3",comparisonStatistic:"4.1",samples:{exposed:38,comparison:52,total:90},metrics:{strength:"strong"},confidence:{icon:"🌳",label:"Très forte tendance",cls:"high"},basis:"38 périodes suivant une exposition possible au soya ont été comparées à 52 journées sans exposition repérée. Les symptômes proviennent principalement des observations globales, pas seulement des ressentis après repas."},
        {id:"elodie-soy-digestive",icon:"🤢",title:"Quelques réactions digestives",text:"Des nausées ou douleurs abdominales sont aussi consignées après certaines expositions, mais cette association est moins répétée que la tendance cutanée.",statistic:"3.0",comparisonStatistic:"4.0",samples:{exposed:38,comparison:52,total:90},metrics:{strength:"moderate"},confidence:{icon:"🌿",label:"Bonne tendance",cls:"medium"},basis:"Six observations digestives ont été relevées durant la période. Ce nombre demeure insuffisant pour tirer une conclusion clinique."}
      ],
      insights:[
        {icon:"🔎",title:"Les observations globales révèlent le délai",text:"Plusieurs réactions sont notées le soir ou le lendemain d’un repas contenant du soya; elles auraient été difficiles à relier au seul ressenti immédiatement après le repas.",confidence:{label:"Élevée",cls:"high"},basis:"Chronologie de 90 jours combinant repas et observations globales.",kind:"reference"},
        {icon:"📉",title:"Les poussées deviennent moins fréquentes",text:"Le dernier mois contient moins d’expositions possibles au soya et moins d’observations cutanées que les deux premiers mois.",confidence:{label:"Moyenne",cls:"medium"},basis:"Comparaison mensuelle du profil fictif; cette évolution ne confirme pas une allergie.",kind:"reference"}
      ]
    }
  };

  const rand = seed => { const x=Math.sin(seed*12.9898+78.233)*43758.5453; return x-Math.floor(x); };
  const keyFor = offset => { const d=new Date(); d.setHours(12,0,0,0); d.setDate(d.getDate()+offset); return d.toLocaleDateString("en-CA"); };
  const POSITIVE_FEELINGS=new Set(["feeling_good","stable_energy","energy","satisfied","easy_digestion","light_after_meal","focus","good_mood","calm"]);
  const meal = (profile,date,time,type,description,energy,tags=[],rating=3,notes="") => {
    const scores=Object.fromEntries(tags.map(id=>[id,Math.max(1,Math.min(5,Number(rating)||3))]));
    const feelingsBefore=Object.fromEntries(tags.filter(id=>!POSITIVE_FEELINGS.has(id)).map(id=>[id,Math.max(1,(scores[id]||3)-2)]));
    return {
      id:`demo-${profile}-${date}-${time.replace(":","")}-${type}`, date,time,type,description,
      fatigueBefore:energy,fatigueAfter:0,feelingsBefore,notes,
      feeling:{rating,tags,scores,beforeScores:feelingsBefore,notes:"",recordedAt:`${date}T${time}:00`},
      createdAt:`${date}T${time}:00`,updatedAt:`${date}T${time}:00`
    }
  };
  function commonDay(store,date,seed,sleep,water,activity){
    store.days[date]={date,sleepHours:sleep,sleepTags:sleep<6.5?["frequent-wakings"]:[],sleepComment:"",water,activities:activity?[
      {id:`demo-a-${date}`,type:activity.type,minutes:activity.minutes,intensity:"moderate",at:`${date}T17:30:00`}
    ]:[],meals:[],observations:[],supplementsTaken:[],updatedAt:`${date}T21:00:00`};
    return store.days[date];
  }
  function buildMarie(store,offset,date,seed){
    const elapsed=offset+179,week=Math.min(25,Math.floor(elapsed/7)),phase=Math.floor(elapsed/30); const weekday=new Date(`${date}T12:00:00`).getDay();
    const shift=(seed%7===0||seed%11===0); const late=shift&&rand(seed)>.45;
    const dairyChance=week<5?.82:week<10?.76:week<14?.55:week<19?.34:.20;
    const dairy=rand(seed+3)<dairyChance; const missed=rand(seed+9)<.075;
    const sleep=Number((late?5.7+rand(seed)*.7:6.6+rand(seed)*1.4).toFixed(1));
    const water=3+Math.floor(rand(seed+2)*5); const day=commonDay(store,date,seed,sleep,water,weekday===0?{type:"Marche",minutes:35}:null);
    if(missed)return;
    if(rand(seed+4)>.12) day.meals.push(meal("marie",date,late?"09:10":"06:35","Déjeuner",dairy?"Cappuccino et toast au beurre d’arachide":"Café noir, œufs et rôties",sleep>=7?4:2,sleep<6.5?["fatigue"]:["energy"],sleep>=7?4:2));
    const lunch=dairy?(rand(seed)>.5?"Sandwich au fromage, crudités et yogourt":"Pâtes crémeuses au poulet et légumes"):(rand(seed)>.5?"Bol de riz, poulet et légumes":"Soupe, sandwich à la dinde et fruit");
    const digestiveChance=week<4?.66:week<9?.76:week<12?.64:week<16?.45:week<21?.30:.18;
    const dairyDigestive=dairy&&rand(seed+7)<digestiveChance;
    // Quelques inconforts existent aussi sans produit laitier afin que le
    // dossier demeure réaliste et que l'association ne paraisse pas absolue.
    const backgroundDigestive=!dairy&&rand(seed+23)<.07;
    const digestive=dairyDigestive||backgroundDigestive;
    const symptomSets=[["bloating","gas"],["cramps","bloating"],["diarrhea","gas"],["nausea","bloating"]];
    const digestiveTags=digestive?symptomSets[seed%symptomSets.length].slice():[];
    if(digestive&&rand(seed+13)<.22)digestiveTags.push("fatigue");
    const digestiveNotes=["Ballonnements et beaucoup de gaz après le repas.","Crampes, gargouillis et sensation de ventre tendu.","Selles molles avec sensation de bouillonnement dans le ventre.","Nausée légère et ventre très gonflé après le repas."];
    const digestiveScore=digestive?(backgroundDigestive?3:(week<10?(rand(seed+18)>.48?1:2):week<17?2:3)):4;
    day.meals.push(meal("marie",date,"12:20","Dîner",lunch,dairy?2:(water>=6?4:3),digestive?digestiveTags:(water<5?["fatigue"]:["feeling_good"]),digestiveScore,digestive?digestiveNotes[seed%digestiveNotes.length]:""));
    const friday=weekday===5; const dinner=friday?(dairy?"Pizza au fromage et salade":"Pizza sans fromage et salade"):(dairy?"Poulet, pommes de terre et sauce crémeuse":"Saumon, pommes de terre et légumes");
    const eveningDigestive=dairy&&rand(seed+6)<(week<10?.38:week<17?.24:.11);
    day.meals.push(meal("marie",date,"19:05","Souper",dinner,dairy?2:4,eveningDigestive?["bloating","gas"]:["feeling_good"],eveningDigestive?(week<10?2:3):4,eveningDigestive?"Gargouillis et ventre gonflé en soirée.":""));
    if(week===10&&weekday===0)day.observations.push({id:`demo-marie-observation-${date}`,date,time:"20:00",intensity:3,duration:"several_days",tags:["bloating","gas","cramps"],contexts:["food"],mealIds:[],notes:"Après avoir revu le journal, Marie commence à réduire graduellement les produits laitiers afin d’observer l’évolution de ses inconforts digestifs.",createdAt:`${date}T20:00:00`,updatedAt:`${date}T20:00:00`});
    const postMealFatigue=digestive&&rand(seed+14)<.25;
    if(rand(seed+8)<.32) day.meals.push(meal("marie",date,"15:40","Collation",dairy?"Latte et muffin":"Pomme et amandes",3,postMealFatigue?["fatigue"]:["energy"],digestive?3:4,postMealFatigue?"Fatigue et léger malaise avec l’inconfort digestif.":""));
  }
  function buildAlex(store,offset,date,seed){
    const weekday=new Date(`${date}T12:00:00`).getDay(); const missed=rand(seed+8)<.045;
    const sleep=Number((7.2+rand(seed)*1.1-(weekday===6?-.3:0)).toFixed(1)); const water=7+Math.floor(rand(seed+2)*3);
    const active=[1,2,4,6].includes(weekday); const day=commonDay(store,date,seed,sleep,water,active?{type:weekday===6?"Vélo":"Course",minutes:weekday===6?65:38}:null);
    if(missed)return;
    day.meals.push(meal("alex",date,"07:20","Déjeuner",seed%3===0?"Overnight oats, bleuets, chia et yogourt grec":"Œufs, pain complet, avocat et fruit",4,["energy"],4));
    day.meals.push(meal("alex",date,"12:10","Dîner",seed%2===0?"Poulet, quinoa, brocoli et poivrons":"Bol de tofu, riz brun et légumes",4,["feeling_good"],4));
    day.meals.push(meal("alex",date,"18:30","Souper",weekday===5?"Burger maison, pommes de terre et salade":"Saumon ou lentilles, légumes et riz",active?4:3,active?["good_mood"]:["feeling_good"],4));
    if(active||rand(seed+5)<.4)day.meals.push(meal("alex",date,"15:30","Collation","Banane, noix et fromage cottage",4,["energy"],4));
  }
  function buildSophie(store,offset,date,seed){
    const elapsed=offset+179,week=Math.min(25,Math.floor(elapsed/7)),phase=Math.floor(elapsed/30); const weekday=new Date(`${date}T12:00:00`).getDay(); const missed=rand(seed+10)<.08;
    const sleep=Number((6.7+rand(seed)*1.2).toFixed(1)); const water=Math.min(9,3+phase+Math.floor(rand(seed+2)*3));
    const active=phase>=2&&[2,4,0].includes(weekday); const day=commonDay(store,date,seed,sleep,water,active?{type:"Marche",minutes:25+phase*4}:null);
    if(missed)return;
    const highFiber=rand(seed+4)<(week<7?.12:week<14?.20:week<18?.46:week<22?.68:.82);
    day.meals.push(meal("sophie",date,"08:05","Déjeuner",highFiber?"Gruau, pomme, graines de chia et cannelle":"Rôties blanches et café",highFiber?4:2,sleep<6.5?["fatigue"]:["feeling_good"],3));
    day.meals.push(meal("sophie",date,"12:35","Dîner",highFiber?"Salade de quinoa, pois chiches, concombre et feta":"Sandwich jambon-fromage et croustilles",highFiber?4:2,[],3));
    const digestiveChance=week<6?.58:week<13?.66:week<16?.72:week<20?.43:week<23?.28:.16;
    const digestive=rand(seed+7)<(highFiber&&week>=16?digestiveChance*.55:digestiveChance);
    const digestiveScore=digestive?(week<14?(rand(seed+16)>.55?1:2):week<19?2:3):4;
    day.meals.push(meal("sophie",date,"18:40","Souper",highFiber?(seed%2?"Chili aux haricots, riz brun et légumes":"Lentilles, légumes rôtis et quinoa"):(seed%2?"Pâtes sauce rosée":"Repas préparé et pain"),highFiber?4:2,digestive?["bloating","stomachache"]:["easy_digestion"],digestiveScore,digestive?"Inconfort digestif en soirée.":""));
    if(week===15&&weekday===0)day.observations.push({id:`demo-sophie-observation-${date}`,date,time:"19:45",intensity:3,duration:"several_days",tags:["bloating","stomachache"],contexts:["food","hydration"],mealIds:[],notes:"Sophie commence à augmenter les fibres progressivement, avec davantage d’eau, après avoir remarqué leur faible présence dans son journal.",createdAt:`${date}T19:45:00`,updatedAt:`${date}T19:45:00`});
    if(rand(seed+5)<.35)day.meals.push(meal("sophie",date,"15:20","Collation",highFiber?"Pomme et amandes":"Biscuits et café",3,digestive?["bloating"]:["energy"],digestive?2:4));
  }
  function buildElodie(store,offset,date,seed){
    const week=Math.min(12,Math.floor((offset+89)/7)),weekday=new Date(`${date}T12:00:00`).getDay();
    const soyChance=[.76,.82,.88,.84,.78,.70,.54,.38,.25,.16,.11,.08,.05][week],soy=rand(seed+3)<soyChance;
    const day=commonDay(store,date,seed,Number((6.8+rand(seed)*1.1).toFixed(1)),5+Math.floor(rand(seed+2)*4),weekday===0?{type:"Marche",minutes:40}:null);
    day.meals.push(meal("elodie",date,"07:35","Déjeuner",soy&&seed%4===0?"Bol de fruits, granola et boisson de soya":"Gruau, petits fruits et lait d’avoine",3,["feeling_good"],4));
    const lunch=soy?(seed%2?"Bol de tofu, riz, edamame et légumes":"Salade de nouilles, légumes et vinaigrette au soya"):(seed%2?"Bol de poulet, riz et légumes":"Salade de quinoa, pois chiches et légumes");
    const lunchMeal=meal("elodie",date,"12:25","Dîner",lunch,3,["feeling_good"],4);day.meals.push(lunchMeal);
    const dinner=soy&&seed%3===0?"Saumon, légumes et sauce miso":"Poulet rôti, pommes de terre et légumes";
    const dinnerMeal=meal("elodie",date,"18:45","Souper",dinner,3,["feeling_good"],4);day.meals.push(dinnerMeal);
    if(rand(seed+8)<.28)day.meals.push(meal("elodie",date,"15:30","Collation",soy?"Yogourt de soya et bleuets":"Pomme et amandes",3,["energy"],4));

    const previousKey=keyFor(offset-1),previous=store.days[previousKey];
    const previousSoyMeals=(previous?.meals||[]).filter(m=>/(soya|tofu|edamame|miso)/i.test(m.description));
    const reactionChance=[.78,.86,.93,.90,.87,.82,.68,.52,.36,.24,.16,.11,.08][week];
    if(previousSoyMeals.length&&rand(seed+11)<reactionChance){
      const variants=[
        {tags:["itching","redness"],emoji:"🌿",duration:"several_days",notes:"Poussée d’eczéma et démangeaisons remarquées depuis ce matin, sans certitude sur le déclencheur."},
        {tags:["hives","itching"],emoji:"🟥",duration:"few_hours",notes:"Plaques rouges qui démangent apparues en fin de journée. Aucun symptôme respiratoire."},
        {tags:["redness","itching"],emoji:"🤚",duration:"day",notes:"Rougeurs et démangeaisons diffuses; début possiblement retardé par rapport aux repas d’hier."},
        {tags:["nausea","stomachache"],emoji:"🤢",duration:"few_hours",notes:"Nausée et inconfort abdominal léger. Observation conservée séparément des repas."}
      ];
      const v=variants[seed%variants.length];
      const intensityBase=[3,3,4,4,4,4,3,3,2,2,2,1,1][week];
      const intensity=Math.max(1,Math.min(5,intensityBase+(rand(seed+19)>.58?1:0)));
      const learningNote=week>=6?" La fréquence du soya est réduite depuis que la chronologie des réactions a commencé à ressortir.":"";
      day.observations.push({id:`demo-elodie-observation-${date}`,date,time:seed%2?"10:40":"20:15",intensity,duration:v.duration,tags:v.tags,contexts:["food","unknown"],mealIds:previousSoyMeals.map(m=>m.id),notes:v.notes+learningNote,createdAt:`${date}T10:40:00`,updatedAt:`${date}T20:15:00`});
    }else if(!previousSoyMeals.length&&rand(seed+17)<(week<6?.16:.08)){
      day.observations.push({id:`demo-elodie-background-${date}`,date,time:"19:30",intensity:2,duration:"few_hours",tags:["redness","itching"],contexts:[seed%2?"environment":"stress","unknown"],mealIds:[],notes:"Rougeur légère sans exposition alimentaire évidente; le contexte demeure incertain.",createdAt:`${date}T19:30:00`,updatedAt:`${date}T19:30:00`});
    }
  }
  function create(profileId="marie"){
    const p=profiles[profileId]||profiles.marie;
    const profileDays=p.id==="elodie"?90:180;
    const demoVersions={marie:"marie-dairy-v3",alex:"base-v1",sophie:"sophie-fiber-v2",elodie:"elodie-soya-v2"};
    const store={version:24,createdAt:new Date(Date.now()-profileDays*DAY).toISOString(),updatedAt:new Date().toISOString(),settings:{waterGoal:8,theme:"system",showWelcome:false,insightsEnabled:true,nutritionObservations:true,macroTracking:true,generalRecommendations:true,showSources:true,professionalSupport:false,feelingReminders:false,feelingDelayHours:2,feelingMealTypes:["Déjeuner","Dîner","Souper"],supplements:[],demoMode:true,demoTourSeen:true,demoName:p.name,demoProfileId:p.id,demoReadOnly:true,demoDataVersion:demoVersions[p.id]},favorites:[],days:{}};
    const favs={
      marie:[["Déjeuner rapide","Déjeuner","Cappuccino et toast au beurre d’arachide"],["Dîner de quart","Dîner","Sandwich, crudités et fruit"],["Pizza du vendredi","Souper","Pizza et salade"]],
      alex:[["Overnight oats","Déjeuner","Overnight oats, bleuets, chia et yogourt grec"],["Bol protéiné","Dîner","Poulet, quinoa et légumes"],["Collation entraînement","Collation","Banane et noix"]],
      sophie:[["Gruau pomme-chia","Déjeuner","Gruau, pomme, chia et cannelle"],["Salade pois chiches","Dîner","Quinoa, pois chiches et légumes"],["Chili maison","Souper","Chili aux haricots et riz brun"]],
      elodie:[["Gruau sans soya","Déjeuner","Gruau, petits fruits et lait d’avoine"],["Bol poulet-riz","Dîner","Poulet, riz et légumes"],["Souper simple","Souper","Poulet rôti, pommes de terre et légumes"]]
    }[p.id];
    store.favorites=favs.map((f,i)=>({id:`demo-${p.id}-fav-${i}`,name:f[0],type:f[1],description:f[2],usageCount:8+i*4,createdAt:store.createdAt,updatedAt:store.updatedAt}));
    for(let offset=-(profileDays-1);offset<=0;offset++){
      const date=keyFor(offset),seed=offset+700+(p.id==="alex"?1000:p.id==="sophie"?2000:p.id==="elodie"?3000:0);
      ({marie:buildMarie,alex:buildAlex,sophie:buildSophie,elodie:buildElodie}[p.id])(store,offset,date,seed);
    }
    return store;
  }
  Object.keys(profiles).forEach(id=>profiles[id].brain=referenceBrains[id]);
  window.EnergieDemoProfiles=Object.freeze({profiles,referenceBrains,create});
})();
