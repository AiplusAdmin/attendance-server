
var HashMap = require('hashmap');
const xlsx = require('xlsx');
const path = require('path');

function subjectName(subject){
    subject = subject.split('.');
    var name;

    switch(subject[0].toUpperCase()){
        case 'M':
            name = 'математика';
            break;
        case 'М':
            name = 'математика';
            break;
        case 'GM':
            name = 'геометрия';
            break;
        case 'A':
            name = 'алгебра';
            break;
        case 'MG':
            name = 'мат. грамотность';
            break;
        case 'K':
            name = 'казахский язык';
            break;
        case 'R':
            name = 'русский язык';
            break;
        case 'E':
            name = 'английский язык';
            break;
        case 'L':
            name = 'логика';
            break;
        case 'F':
            name = 'физика';
            break;
        case 'CH':
            name = 'химия';
            break;
        case 'X':
            name = 'химия';
            break;
        case 'B':
            name = 'биология';
            break;
        case 'HK':
            name = 'история Казахстана';
            break;
        case 'OB':
            name = 'обучение грамоте';
            break;
        case 'KL':
            name = 'каллиграфия';
            break;
        case 'G':
            name = 'география';
            break;
        case 'SA':
            name = 'обучение грамотности';
            break;
        case 'WH':
            name = 'всемирная История';
            break;
        case 'OG':
            name = 'обучению грамоте';
			break;
		case 'GR':
			name = 'грамотность чтения';
			break;
        case 'RR':
            name = 'развития речи';
            break;
        case 'D':
            name = 'познания мира';
            break;
        case 'RD':
            name = 'чтения';
            break;
        case 'T':
            name = 'творчество';
            break;
        case 'P':
            name = 'письмо';
            break;
        case 'CHOP':
            name = 'человек Общество Право';
            break;
        case 'N':
            name = 'началка';
            break;
        case 'IND':
            switch(subject[1].toUpperCase()){
            case 'M':
                name = 'математика';
                break;
            case 'GM':
                name = 'геометрия';
                break;
            case 'A':
                name = 'алгебра';
                break;
            case 'MG':
                name = 'мат. грамотность';
                break;
            case 'K':
                name = 'казахский язык';
                break;
            case 'R':
                name = 'русский язык';
                break;
            case 'E':
                name = 'английский язык';
                break;
            case 'L':
                name = 'логика';
                break;
            case 'F':
                name = 'физика';
                break;
            case 'CH':
                name = 'химия';
                break;
            case 'X':
                name = 'химия';
                break;
            case 'B':
                name = 'биология';
                break;
            case 'HK':
                name = 'история Казахстана';
                break;
            case 'OB':
                name = 'обучение грамоте';
                break;
            case 'KL':
                name = 'каллиграфия';
                break;
            case 'G':
                name = 'география';
                break;
            case 'SA':
                name = 'сауат Ашу';
                break;
            case 'WH':
                name = 'всемирная История';
                break;
            case 'OG':
                name = 'обучению грамоте';
                break;
            case 'RR':
                name = 'развития речи';
                break;
            case 'D':
                name = 'познания мира';
                break;
            case 'RD':
                name = 'чтения';
                break;
            case 'T':
                name = 'творчество';
                break;
            case 'P':
                name = 'письмо';
				break;
			case 'GR':
				name = 'грамотность чтения';
				break;
            case 'CHOP':
                name = 'человек Общество Право';
                break;
            case 'N':
                name = 'началка';
                break;
            }
            break;
        default:
            name = 'индивидуальный урок';
            break;
    }

    return name;
}

function subjectNameKaz(subject){
	subject = subject.split('.');
    let name;

    switch(subject[0].toUpperCase()){
        case 'M':
            name = 'математика';
            break;
        case 'A':
            name = 'алгебра';
            break;
        case 'GM':
            name = 'геомерия';
            break;
        case 'MG':
            name = 'мат. сауаттылық';
            break;
        case 'K':
            name = 'қазақ тілі';
            break;
        case 'R':
            name = 'орыс тілі';
            break;
        case 'E':
            name = 'ағылшын тілі';
            break;
        case 'L':
            name = 'логика';
            break;
        case 'F':
            name = 'физика';
            break;
        case 'CH':
            name = 'химия';
			break;
		 case 'X':
            name = 'химия';
            break;
        case 'B':
            name = 'биология';
            break;
        case 'HK':
            name = 'қазақстан тарихы';
            break;
        case 'OB':
            name = 'оқу сауаттылығы';
            break;
        case 'KL':
            name = 'каллиграфия';
            break;
        case 'G':
            name = 'география';
            break;
        case 'SA':
            name = 'сауат ашу';
            break;
        case 'WH':
            name = 'дүние жүзі тарихы';
            break;
        case 'RR':
            name = 'сөйлеуді дамыту';
            break;
        case 'D':
            name = 'әлем туралы білім';
            break;
        case 'RD':
            name = 'оқу';
            break;
        case 'T':
            name = 'творчество';
            break;
        case 'P':
            name = 'письмо';
            break;
        case 'CHOP':
            name = 'адам қоғамы заңы';
			break;
        case 'N':
                name = 'началка';
                break;
		case 'IND':
				switch(subject[1].toUpperCase()){
				case 'M':
					name = 'математика';
					break;
				case 'GM':
					name = 'геометрия';
					break;
				case 'A':
					name = 'алгебра';
					break;
				case 'MG':
					name = 'мат. грамотность';
					break;
				case 'K':
					name = 'казахский язык';
					break;
				case 'R':
					name = 'русский язык';
					break;
				case 'E':
					name = 'английский язык';
					break;
				case 'L':
					name = 'логика';
					break;
				case 'F':
					name = 'физика';
					break;
				case 'CH':
					name = 'химия';
					break;
				case 'X':
					name = 'химия';
					break;
				case 'B':
					name = 'биология';
					break;
				case 'HK':
					name = 'история Казахстана';
					break;
				case 'OB':
					name = 'обучение грамоте';
					break;
				case 'KL':
					name = 'каллиграфия';
					break;
				case 'G':
					name = 'география';
					break;
				case 'SA':
					name = 'сауат Ашу';
					break;
				case 'WH':
					name = 'всемирная История';
					break;
				case 'OG':
					name = 'обучению грамоте';
					break;
				case 'RR':
					name = 'развития речи';
					break;
				case 'D':
					name = 'познания мира';
					break;
				case 'RD':
					name = 'чтения';
					break;
				case 'T':
					name = 'творчество';
					break;
				case 'P':
					name = 'письмо';
					break;
				case 'CHOP':
					name = 'человек Общество Право';
					break;
				}
				break;
			default:
				name = 'индивидуальный урок';
				break;
	}
	
    return name;
}

function getBranch(subject){
	if(subject.includes('RO'))
		return 'РО';
	else
		return 'КО';
}

function getWeekDay(day){
	var dt = new Date(day);

    var weekday = new Array(7);
    weekday[0] = "Вс";
    weekday[1] = "Рн";
    weekday[2] = "Вт";
    weekday[3] = "Ср";
    weekday[4] = "Чт";
    weekday[5] = "Пт";
    weekday[6] = "Сб";
    
    return weekday[dt.getDay()];
}

function getClass(subject){
	var gr = subject.split('.');
	var klass = gr[0] == 'IND' ? gr[2]:gr[1] == 'N'?gr[2]:gr[1];
	return klass;
}

function getSubject(subject){
	var gr = subject.split('.');
	var subject = gr[0] == 'IND' ? gr[1]:gr[0];

	return subject;
}

function Capitalize(string){
	return string.charAt(0).toUpperCase() + string.slice(1);
}

function messageDay(tests, language, name, data){
	var greeting = ['Здравствуйте!\u{1F337}','Доброго времени суток!\u{1F917}','Уважаемый родитель!\u{1F9D4}\u{1F469}','Добрый день!\u{2600}'];
    var meeting = ['Информирую Вас об успеваемости вашего ребенка за [дата].\u{1F4C8}','Сообщаю результаты Вашего ребенка за [дата].\u{1F4CA}','Результаты за предыдущий урок. [дата]\u{1F4DD}','Оповещаю Вас об итогах за последние занятия. [дата]\u{2705}','Уведомляю Вас о результатах Вашего ребенка. [дата]\u{1F4DA}'];
    var srezs = ['*Итоги среза по дисциплинам\u{1F4D2} (максимально 10 баллов):*','*Итоги по предметам\u{1F4DA} (максимально 10 баллов):*','*Результаты среза\u{1F4C9} (максимально 10 баллов):*'];
    var itog = '*[Предмет в им под]*: [0-10 баллов]';
    var res1 = ['Не переживайте за результат, мы обязательно отработаем проблему и выявим причину!\u{1F3AF}','К сожалению плохо закреплена тема, проводится разговор с тренером для выявления причины.\u{1F587}','Так как  срез показал ниже среднего результат, я проведу беседу с тренером и ознакомлюсь с работой.\u{1F50E}'];//,'По результатам среза видно, что ученик не до конца освоил материал. Тренер возьмет во внимание и объяснит повторно тему.'
    var res2 = ['Хороший средний результат! Будем стараться набирать больше.\u{1F948}','Хороший результат, но есть над чем работать. Наш тренер проведет работу по затрудняющимся вопросами.\u{1F4DD}','Ученик набрал средний балл. В последующем, будем стараться улучшать показатели.\u{1F44D}'];
    var res3 = ['Отличный результат! Будем держать планку.\u{1F4AA}','[Имя ребенка в им пад] постарался/ась, очень хороший показатель!\u{2705}','[Имя ребенка в им пад] порадовал/а своими результатами.\u{1F44F}','Результат среза выше среднего. Это означает, что ученик освоил тему, но есть несколько вопросов с которыми у него возникли проблемы. Обязательно возьмем их во внимание.\u{1F3EB}'];
    var res4 = ['Результаты супер! Так держать!\u{270A}','[Имя ребенка в им пад] молодец! Один из высших результатов.\u{1F3C6}','[Имя ребенка в им пад] снова радует!\u{1F947}','Результаты срезы высокие. Ученик освоил материал в полной мере\u{1F4AF}, но возможно возникли ошибки из-за невнимательности.\u{1F440}'];
	var home = new HashMap();
    home.set(0,'*[Имя ребенка в им пад] не выполнил/а домашнее задание по всем предметам. Прошу Вас проконтролировать этот момент, выполнение домашнего задания очень важно для закрепление темы*\u{1F4CC}')
	home.set(4,'*[Имя ребенка в им пад] выполнил/а домашнее задание по всем предметам правильно на 40%.*\u{1F641}');
	home.set(5,'*[Имя ребенка в им пад] выполнил/а домашнее задание по всем предметам наполовину.*\u{1F641}');
    home.set(7,'*[Имя ребенка в им пад] выполнил/а домашнее задание по всем предметам правильно на 70%.*\u{1F641}');
    home.set(6,'*[Имя ребенка в им пад] выполнил/а домашнее задание по всем предметам правильно на 60%.*\u{1F641}');
    home.set(8,'*[Имя ребенка в им пад] выполнил/а домашнее задание по всем предметам правильно на 80%! Постоянное выполнение домашнего задания приведет к отличным результатам!*\u{1F609}');
	home.set(9,'*[Имя ребенка в им пад] выполнил/а домашнее задание по всем предметам правильно на 90%! Постоянное выполнение домашнего задания приведет к отличным результатам!*\u{1F609}');
    home.set(10,'*[Имя ребенка в им пад] выполнил/а домашнее задание по всем предметам правильно! Постоянное выполнение домашнего задания приведет к отличным результатам!*\u{1F609}');
	home.set(11,'*По всем предметам домашнее задание не задавалось.*\u{1F917}');
	home.set(1,'*[Имя ребенка в им пад] выполнил/а малую часть домашнего задания по всем предметам, выполнение домашнего задания очень важно для закрепление темы.*\u{1F9D0}');
	home.set(2,'*[Имя ребенка в им пад] выполнил/а малую часть домашнего задания по всем предметам, выполнение домашнего задания очень важно для закрепление темы.*\u{1F9D0}');
	home.set(3,'*[Имя ребенка в им пад] выполнил/а малую часть домашнего задания по всем предметам, выполнение домашнего задания очень важно для закрепление темы.*\u{1F9D0}');
    let home1 = new HashMap();
    home1.set(0,'*Домашнее задание:* \n*[предмет в им под]:* не выполнено \u{203C}');
    home1.set(1,'*Домашнее задание:* \n*[предмет в им под]:* выполнено правильно на 10%\u{1F62F}');
	home1.set(2,'*Домашнее задание:* \n*[предмет в им под]:* выполнено правильно на 20%\u{1F62F}');
	home1.set(3,'*Домашнее задание:* \n*[предмет в им под]:* выполнено правильно на 30%\u{1F62F}');
    home1.set(4,'*Домашнее задание:* \n*[предмет в им под]:* выполнено правильно на 40%\u{1F62F}');
    home1.set(5,'*Домашнее задание:* \n*[предмет в им под]:* выполнено правильно на 50%\u{1F62F}');
    home1.set(6,'*Домашнее задание:* \n*[предмет в им под]:* выполнено правильно на 60%\u{1F62F}');
    home1.set(7,'*Домашнее задание:* \n*[предмет в им под]:* выполнено правильно на 70%\u{1F62F}');
    home1.set(8,'*Домашнее задание:* \n*[предмет в им под]:* выполнено правильно на 80%\u{1F62F}');
    home1.set(9,'*Домашнее задание:* \n*[предмет в им под]:* выполнено правильно на 90%\u{1F62F}');
	home1.set(10,'*Домашнее задание:* \n*[предмет в им под]:* выполнено правильно на 100%\u{1F4AF}') ;
    home1.set(11,'*Домашнее задание:* \n*[предмет в им под]:* не задавалось\u{1F4D6}');
    let home2 = new HashMap();
	home2.set(0,'*[предмет в им под]:* не выполнено \u{203C}');
    home2.set(1,'*[предмет в им под]:* выполнено правильно на 10%\u{1F62F}');
	home2.set(2,'*[предмет в им под]:* выполнено правильно на 20%\u{1F62F}');
	home2.set(3,'*[предмет в им под]:* выполнено правильно на 30%\u{1F62F}');
    home2.set(4,'*[предмет в им под]:* выполнено правильно на 40%\u{1F62F}');
    home2.set(5,'*[предмет в им под]:* выполнено правильно на 50%\u{1F62F}');
    home2.set(6,'*[предмет в им под]:* выполнено правильно на 60%\u{1F62F}');
    home2.set(7,'*[предмет в им под]:* выполнено правильно на 70%\u{1F62F}');
    home2.set(8,'*[предмет в им под]:* выполнено правильно на 80%\u{1F62F}');
    home2.set(9,'*[предмет в им под]:* выполнено правильно на 90%\u{1F62F}');
	home2.set(10,'*[предмет в им под]:* выполнено правильно на 100%\u{1F4AF}') ;
    home2.set(11,'*[предмет в им под]:* не задавалось\u{1F4D6}');
    let work = new HashMap();
    work.set(0,'');
    work.set(1,'');
    work.set(2,'');
    work.set(3,'');
	work.set(4,'');
	work.set(5,'');
	work.set(6,'');
	work.set(7,'');
	work.set(8,'');
	work.set(9,'');
	work.set(10,'');
	work.set(11,'');
	if(language == 'KAZ'){
        greeting = ['Салеметсіз бе!\u{1F337}','Қайырлы күн!\u{1F917}','Құрметті ата-ана!\u{1F9D4}\u{1F469}'];
        meeting = ['Балаңыздың оқу үлгерімі туралы хабардар етемін. [дата]\u{1F4C8}','Балаңыздың оқу нәтижелері бойынша ақпарат. [дата]\u{1F4CA}','Өткен сабақ бойынша нәтижелері. [дата]\u{1F4DD}','Соңғы сабақтардағы нәтижелері. [дата]\u{2705}','Балаңыздың өтілген сабақ бойынша ағымдық нәтижелері. [дата]\u{1F4DA}'];
        srezs = ['*Бақылау нәтижелері\u{1F4D2} (максималды 10 балл):*','*Бақылау қорытындылары\u{1F4DA} (максималды 10 балл):*','*Пәндік бақылау бойынша нәтиже көрсеткіштері\u{1F4C9} (максималды 10 балл):*'];
        res1 = ['Алынған нәтижелерге алаңдамаңыз, біз міндетті түрде себебін анықтап, мәселемен жұмыс жасаймыз.\u{1F3AF}','Өкінішке орай тақырып дұрыс бекітілмеген, сондықтан себебін анықтау мақсатында мұғаліммен жұмыс жасаудамыз.\u{1F587}','Бақылау нәтижесі орта деңгейден төмен болғандықтан, мен тренермен сөйлесіп, бақылау жұмысымен тереңірек танысып шығамын.\u{1F50E}'];
        res2 = ['Орташа жақсы көрсеткіш! Одан да жоғары алуға тырысамыз!\u{1F948}','Жақсы нәтиже, алайда жұмыс жасайтын тұстар бар. Күрделі сұрақтар бойынша біздің тренер жұмыс жасайды.\u{1F4DD}','Бала орташа көрсеткішке қол жеткізді, алдағы уақытта оны одан әрі жоғарылатуға тырысамыз.\u{1F44D}'];
        res3 = ['Керемет нәтиже! Алған беттен таймаймыз!\u{270A}','[Имя ребенка в им пад] Жарайсың! Ең жоғарғы көрсеткіштердің бірі!\u{1F3C6}','[Имя ребенка в им пад] нәтижелерімен тағы да қуантып жатыр!\u{1F947}','Бақылау көрсеткіштері өте жақсы. Тақырыпты толықтай меңгерген\u{1F4AF}, дегенімен қателер баланың дұрыс зейін аудармағанынан болуы мүмкін.\u{1F440}'];
        res4 = ['Керемет нәтиже! Алған беттен таймаймыз!\u{270A}','[Имя ребенка в им пад] Жарайсың! Ең жоғарғы көрсеткіштердің бірі!\u{1F3C6}','[Имя ребенка в им пад] нәтижелерімен тағы да қуантып жатыр!\u{1F947}','Бақылау көрсеткіштері өте жақсы. Тақырыпты толықтай меңгерген\u{1F4AF}, дегенімен қателер баланың дұрыс зейін аудармағанынан болуы мүмкін.\u{1F440}'];
        home.set(0,'*Үй жұмысын барлық пәндер бойынша орындамады. Осы мәселеге көңіл бөлуңізді сұраймын, ұй жұмысын орындау тақырыпты бекітуде маңызды орын алады.*\u{1F4CC}');
		home.set(4,'*Барлық пәндер бойынша үй жұмысы тек жартылай орындалған.*\u{1F641}');
		home.set(5,'*Барлық пәндер бойынша үй жұмысы тек жартылай орындалған.*\u{1F641}');
        home.set(6,'*Барлық пәндер бойынша үй жұмысы тек жартылай орындалған.*\u{1F641}');
        home.set(7,'*Барлық пәндер бойынша үй жұмысы тек жартылай орындалған.*\u{1F641}');
		home.set(8,'*Барлық пәндер бойынша үй жұмысы орындалған! Үй жұмысын үнемі орындау жақсы нәтижелерге жетелейді!*\u{1F609}');
		home.set(9,'*Барлық пәндер бойынша үй жұмысы орындалған! Үй жұмысын үнемі орындау жақсы нәтижелерге жетелейді!*\u{1F609}');
		home.set(10,'*Барлық пәндер бойынша үй жұмысы орындалған! Үй жұмысын үнемі орындау жақсы нәтижелерге жетелейді!*\u{1F609}');
		home.set(11,'*Барлық пәндер бойынша үй жұмысы берілмеген.*\u{1F917}');
        home.set(1,'*Барлық сабақтар бойынша үй жұмысының тек аз бөлігін ғана орындаған. Үй жұмысын толық орындау тақырыпты дұрыс меңгеру үшін қажет.*\u{1F9D0}');
		home.set(2,'*Барлық сабақтар бойынша үй жұмысының тек аз бөлігін ғана орындаған. Үй жұмысын толық орындау тақырыпты дұрыс меңгеру үшін қажет.*\u{1F9D0}'); 
		home.set(3,'*Барлық сабақтар бойынша үй жұмысының тек аз бөлігін ғана орындаған. Үй жұмысын толық орындау тақырыпты дұрыс меңгеру үшін қажет.*\u{1F9D0}');
		home1.set(0,'*Үй жұмысы*: \n*[предмет в им под]*: Үй тапсырмасы орындалмаған\u{203C}');
		home1.set(1,'*Үй жұмысы*: \n*[предмет в им под]*: Үй тапсырмасы 10%-ға дұрыс орындалған\u{1F62F}');
		home1.set(2,'*Үй жұмысы*: \n*[предмет в им под]*: Үй тапсырмасы 20%-ға дұрыс орындалған\u{1F62F}');
        home1.set(3,'*Үй жұмысы*: \n*[предмет в им под]*: Үй тапсырмасы 30%-ға дұрыс орындалған\u{1F62F}');
        home1.set(4,'*Үй жұмысы*: \n*[предмет в им под]*: Үй тапсырмасы 40%-ға дұрыс орындалған\u{1F62F}');
		home1.set(5,'*Үй жұмысы*: \n*[предмет в им под]*: Үй тапсырмасы 50%-ға дұрыс орындалған\u{1F62F}');
		home1.set(6,'*Үй жұмысы*: \n*[предмет в им под]*: Үй тапсырмасы 60%-ға дұрыс орындалған\u{1F62F}');
		home1.set(7,'*Үй жұмысы*: \n*[предмет в им под]*: Үй тапсырмасы 70%-ға дұрыс орындалған\u{1F62F}');
		home1.set(8,'*Үй жұмысы*: \n*[предмет в им под]*: Үй тапсырмасы 80%-ға дұрыс орындалған\u{1F62F}');
		home1.set(9,'*Үй жұмысы*: \n*[предмет в им под]*: Үй тапсырмасы 90%-ға дұрыс орындалған\u{1F62F}');
        home1.set(10,'*Үй жұмысы*: \n*[предмет в им под]*: Үй тапсырмасы 100%-ға дұрыс орындалған\u{1F4AF}');
        home1.set(11,'*[предмет в им под]*: Үй тапсырмасы берілмеген\u{1F4D6}');
		home2.set(0,'*[предмет в им под]*: Үй тапсырмасы орындалмаған\u{203C}');
		home2.set(1,'*[предмет в им под]*: Үй тапсырмасы 10%-ға дұрыс орындалған\u{1F62F}');
		home2.set(2,'*[предмет в им под]*: Үй тапсырмасы 20%-ға дұрыс орындалған\u{1F62F}');
        home2.set(3,'*[предмет в им под]*: Үй тапсырмасы 30%-ға дұрыс орындалған\u{1F62F}');
        home2.set(4,'*[предмет в им под]*: Үй тапсырмасы 40%-ға дұрыс орындалған\u{1F62F}');
		home2.set(5,'*[предмет в им под]*: Үй тапсырмасы 50%-ға дұрыс орындалған\u{1F62F}');
		home2.set(6,'*[предмет в им под]*: Үй тапсырмасы 60%-ға дұрыс орындалған\u{1F62F}');
		home2.set(7,'*[предмет в им под]*: Үй тапсырмасы 70%-ға дұрыс орындалған\u{1F62F}');
		home2.set(8,'*[предмет в им под]*: Үй тапсырмасы 80%-ға дұрыс орындалған\u{1F62F}');
		home2.set(9,'*[предмет в им под]*: Үй тапсырмасы 90%-ға дұрыс орындалған\u{1F62F}');
        home2.set(10,'*[предмет в им под]*: Үй тапсырмасы 100%-ға дұрыс орындалған\u{1F4AF}');
        home2.set(11,'*[предмет в им под]*: Үй тапсырмасы берілмеген\u{1F4D6}');

	}
	

	var sum = 0;
	var j = 0;
	var srezy = '';
	var n = tests.length;
	var message = '';
	var messrez = '';
	var koment = '';
	var greet = greeting[Math.floor(Math.random() * greeting.length)] + '\n';
	var meet = meeting[Math.floor(Math.random() * meeting.length)].replace('[дата]',data) + '\n\n';

   tests.map(function(test){
		test.Skills.map(function(skill){
			if(skill.SkillName == 'Оценка учителя'){
				var homework = work.get(skill.Score);
				if(!homework){
					homework += Capital(language == 'KAZ'? subjectNameKaz(test.EdUnitName):subjectName(test.EdUnitName));
				} else {
					homework += ',' + Capital(language == 'KAZ'? subjectNameKaz(test.EdUnitName):subjectName(test.EdUnitName));
				}
				work.set(skill.Score, homework);
			} else if(skill.SkillName == 'Срез'){
				if(skill.Score >= 0 && skill.Score <= 10 && !isIntensiv(test.EdUnitName)){
					var subject = Capital(language == 'KAZ'? subjectNameKaz(test.EdUnitName):subjectName(test.EdUnitName));
					srezy += itog.replace('[Предмет в им под]',subject).replace('[0-10 баллов]',skill.Score) + '\n';
					sum += skill.Score;
				} else {
					n--;
				}
			}
		})
   });

   if(srezy) {
		let avg = sum/n;
		if(avg >= 0 && avg < 4.5){
			koment = res1[Math.floor(Math.random() * res1.length)] + '\n\n';
			koment = koment.replace('[Имя ребенка в им пад]',name.split(' ')[1]);

		}else if(avg >=4.5 && avg < 6.5){
			koment = res2[Math.floor(Math.random() * res2.length)] + '\n\n';
			koment = koment.replace('[Имя ребенка в им пад]',name.split(' ')[1]);

		}else if(avg >=6.5 && avg< 8.5){
			koment = res3[Math.floor(Math.random() * res3.length)] + '\n\n';
			koment = koment.replace('[Имя ребенка в им пад]',name.split(' ')[1]);

		}else if(avg >= 8.5 && avg<=10){
			koment = res4[Math.floor(Math.random() * res4.length)] + '\n\n'; 
			koment = koment.replace('[Имя ребенка в им пад]',name.split(' ')[1]);

		}
		messrez = srezs[Math.floor(Math.random() * srezs.length)] + '\n';
		//koment = koment.replace('[Имя ребенка в им пад]',name.split(' ')[1]);
	}

   	work.forEach(function(v,k){
		if(!v){
			work.delete(k);
		}
	});

	work.forEach(function(v,k){
        let size = v.split(',').length;
        j++;
        if(size == 1 && tests.length == size){
            message = home1.get(k);
            message = message.replace('[предмет в им под]', v);
        }
        else if(tests.length == size){
            message = home.get(k);
        }else if(tests.length != size && size == 2){
            switch(j){
                case 1:
                    message += home1.get(k);
                    break;
                default:
                    message += '\n' + home2.get(k);
                    break;
            }
            var subject = language == 'KAZ' ? v.split(',').join(' және ') : v.split(',').join(' и ');
            message = message.replace('[предмет в им под]',subject);
        }else if(tests.length != size && size == 1){
            switch(j){
                case 1:
                    message += home1.get(k);
                    break;
                default:
                    message += '\n' + home2.get(k);
                    break;
 
            }
            message = message.replace('[предмет в им под]',v);
        }
	});
	
	message = message.replace('[Имя ребенка в им пад]',name.split(' ')[1]);

	var kommentari = srezy? messrez + srezy + '\n' + koment + message : message;
	var globalmessage = greet  + name + '\n\n' + meet + kommentari;
	
	return globalmessage;
}

function personalMessage(test,day){
	var messageStart = 'Дорогие родители и ученики, высылаем вам результаты тестов 🤩🥳 📑\n\n';
	var messageType = '🔍Формат: ' + test.TestTypeName + '\n\n';
	var messageFio = '🗣ФИО ученика: ' + test.StudentName + '\n';
	var messageDate = '🗓 Дата: ' + day + '\n';
	var messageSubjects = '📚 Предмет / балл:\n\nРезультаты тестирования  📈\n\n';
	var sum = 0;
	var total = 0;
	test.Skills.map(function(skill){
		messageSubjects += '🔸' + skill.SkillName + ' - ' + skill.Score + '/' + skill.MaxScore + '\n';
		sum+=skill.Score;
		total+=skill.MaxScore;
	});
	var messageTotal = '\n_______\n🔢 Всего: ' + sum + '/' + total;
	var message = messageStart + messageType + messageFio + messageDate + messageSubjects + messageTotal;

 	return message;
}

function notificationMessage(group,student){
	var greeting = ['Здравствуйте!\u{1F337}','Доброго времени суток!\u{1F917}','Уважаемый родитель!\u{1F9D4}\u{1F469}','Добрый день!\u{2600}'];
    var meeting = ['Информирую Вас об успеваемости вашего ребенка за [дата].\u{1F4C8}','Сообщаю результаты Вашего ребенка за [дата].\u{1F4CA}','Результаты за предыдущий урок. [дата]\u{1F4DD}','Оповещаю Вас об итогах за последние занятия. [дата]\u{2705}','Уведомляю Вас о результатах Вашего ребенка. [дата]\u{1F4DA}'];
    var srezs = ['*Итоги среза по дисциплинам\u{1F4D2} (максимально 10 баллов):*','*Итоги по предметам\u{1F4DA} (максимально 10 баллов):*','*Результаты среза\u{1F4C9} (максимально 10 баллов):*'];
    var itog = '*[Предмет в им под]*: [0-10 баллов]';
    var res1 = ['Не переживайте за результат, мы обязательно отработаем проблему и выявим причину!\u{1F3AF}','К сожалению плохо закреплена тема, проводится разговор с тренером для выявления причины.\u{1F587}','Так как  срез показал ниже среднего результат, я проведу беседу с тренером и ознакомлюсь с работой.\u{1F50E}'];//,'По результатам среза видно, что ученик не до конца освоил материал. Тренер возьмет во внимание и объяснит повторно тему.'
    var res2 = ['Хороший средний результат! Будем стараться набирать больше.\u{1F948}','Хороший результат, но есть над чем работать. Наш тренер проведет работу по затрудняющимся вопросами.\u{1F4DD}','Ученик набрал средний балл. В последующем, будем стараться улучшать показатели.\u{1F44D}'];
    var res3 = ['Отличный результат! Будем держать планку.\u{1F4AA}','[Имя ребенка в им пад] постарался/ась, очень хороший показатель!\u{2705}','[Имя ребенка в им пад] порадовал/а своими результатами.\u{1F44F}','Результат среза выше среднего. Это означает, что ученик освоил тему, но есть несколько вопросов с которыми у него возникли проблемы. Обязательно возьмем их во внимание.\u{1F3EB}'];
    var res4 = ['Результаты супер! Так держать!\u{270A}','[Имя ребенка в им пад] молодец! Один из высших результатов.\u{1F3C6}','[Имя ребенка в им пад] снова радует!\u{1F947}','Результаты срезы высокие. Ученик освоил материал в полной мере\u{1F4AF}, но возможно возникли ошибки из-за невнимательности.\u{1F440}'];
	var home1 = new HashMap();
	home1.set(0,'*Домашнее задание:* \n*[предмет в им под]:* не выполнено \u{203C}');
    home1.set(1,'*Домашнее задание:* \n*[предмет в им под]:* выполнено правильно на 10%\u{1F62F}');
	home1.set(2,'*Домашнее задание:* \n*[предмет в им под]:* выполнено правильно на 20%\u{1F62F}');
	home1.set(3,'*Домашнее задание:* \n*[предмет в им под]:* выполнено правильно на 30%\u{1F62F}');
    home1.set(4,'*Домашнее задание:* \n*[предмет в им под]:* выполнено правильно на 40%\u{1F62F}');
    home1.set(5,'*Домашнее задание:* \n*[предмет в им под]:* выполнено правильно на 50%\u{1F62F}');
    home1.set(6,'*Домашнее задание:* \n*[предмет в им под]:* выполнено правильно на 60%\u{1F62F}');
    home1.set(7,'*Домашнее задание:* \n*[предмет в им под]:* выполнено правильно на 70%\u{1F62F}');
    home1.set(8,'*Домашнее задание:* \n*[предмет в им под]:* выполнено правильно на 80%\u{1F62F}');
    home1.set(9,'*Домашнее задание:* \n*[предмет в им под]:* выполнено правильно на 90%\u{1F62F}');
	home1.set(10,'*Домашнее задание:* \n*[предмет в им под]:* выполнено правильно на 100%\u{1F4AF}') ;
	home1.set(11,'*Домашнее задание:* \n*[предмет в им под]:* не задавалось\u{1F4D6}');
	
	if(group.branch == 'КО'){
        greeting = ['Салеметсіз бе!\u{1F337}','Қайырлы күн!\u{1F917}','Құрметті ата-ана!\u{1F9D4}\u{1F469}'];
        meeting = ['Балаңыздың оқу үлгерімі туралы хабардар етемін. [дата]\u{1F4C8}','Балаңыздың оқу нәтижелері бойынша ақпарат. [дата]\u{1F4CA}','Өткен сабақ бойынша нәтижелері. [дата]\u{1F4DD}','Соңғы сабақтардағы нәтижелері. [дата]\u{2705}','Балаңыздың өтілген сабақ бойынша ағымдық нәтижелері. [дата]\u{1F4DA}'];
        srezs = ['*Бақылау нәтижелері\u{1F4D2} (максималды 10 балл):*','*Бақылау қорытындылары\u{1F4DA} (максималды 10 балл):*','*Пәндік бақылау бойынша нәтиже көрсеткіштері\u{1F4C9} (максималды 10 балл):*'];
        res1 = ['Алынған нәтижелерге алаңдамаңыз, біз міндетті түрде себебін анықтап, мәселемен жұмыс жасаймыз.\u{1F3AF}','Өкінішке орай тақырып дұрыс бекітілмеген, сондықтан себебін анықтау мақсатында мұғаліммен жұмыс жасаудамыз.\u{1F587}','Бақылау нәтижесі орта деңгейден төмен болғандықтан, мен тренермен сөйлесіп, бақылау жұмысымен тереңірек танысып шығамын.\u{1F50E}'];
        res2 = ['Орташа жақсы көрсеткіш! Одан да жоғары алуға тырысамыз!\u{1F948}','Жақсы нәтиже, алайда жұмыс жасайтын тұстар бар. Күрделі сұрақтар бойынша біздің тренер жұмыс жасайды.\u{1F4DD}','Бала орташа көрсеткішке қол жеткізді, алдағы уақытта оны одан әрі жоғарылатуға тырысамыз.\u{1F44D}'];
        res3 = ['Керемет нәтиже! Алған беттен таймаймыз!\u{270A}','[Имя ребенка в им пад] Жарайсың! Ең жоғарғы көрсеткіштердің бірі!\u{1F3C6}','[Имя ребенка в им пад] нәтижелерімен тағы да қуантып жатыр!\u{1F947}','Бақылау көрсеткіштері өте жақсы. Тақырыпты толықтай меңгерген\u{1F4AF}, дегенімен қателер баланың дұрыс зейін аудармағанынан болуы мүмкін.\u{1F440}'];
        res4 = ['Керемет нәтиже! Алған беттен таймаймыз!\u{270A}','[Имя ребенка в им пад] Жарайсың! Ең жоғарғы көрсеткіштердің бірі!\u{1F3C6}','[Имя ребенка в им пад] нәтижелерімен тағы да қуантып жатыр!\u{1F947}','Бақылау көрсеткіштері өте жақсы. Тақырыпты толықтай меңгерген\u{1F4AF}, дегенімен қателер баланың дұрыс зейін аудармағанынан болуы мүмкін.\u{1F440}'];
        home1.set(0,'*Үй жұмысы*: \n*[предмет в им под]*: Үй тапсырмасы орындалмаған\u{203C}');
		home1.set(1,'*Үй жұмысы*: \n*[предмет в им под]*: Үй тапсырмасы 10%-ға дұрыс орындалған\u{1F62F}');
		home1.set(2,'*Үй жұмысы*: \n*[предмет в им под]*: Үй тапсырмасы 20%-ға дұрыс орындалған\u{1F62F}');
        home1.set(3,'*Үй жұмысы*: \n*[предмет в им под]*: Үй тапсырмасы 30%-ға дұрыс орындалған\u{1F62F}');
        home1.set(4,'*Үй жұмысы*: \n*[предмет в им под]*: Үй тапсырмасы 40%-ға дұрыс орындалған\u{1F62F}');
		home1.set(5,'*Үй жұмысы*: \n*[предмет в им под]*: Үй тапсырмасы 50%-ға дұрыс орындалған\u{1F62F}');
		home1.set(6,'*Үй жұмысы*: \n*[предмет в им под]*: Үй тапсырмасы 60%-ға дұрыс орындалған\u{1F62F}');
		home1.set(7,'*Үй жұмысы*: \n*[предмет в им под]*: Үй тапсырмасы 70%-ға дұрыс орындалған\u{1F62F}');
		home1.set(8,'*Үй жұмысы*: \n*[предмет в им под]*: Үй тапсырмасы 80%-ға дұрыс орындалған\u{1F62F}');
		home1.set(9,'*Үй жұмысы*: \n*[предмет в им под]*: Үй тапсырмасы 90%-ға дұрыс орындалған\u{1F62F}');
		home1.set(10,'*Үй жұмысы*: \n*[предмет в им под]*: Үй тапсырмасы 100%-ға дұрыс орындалған\u{1F4AF}');
	}

	var name = student.name;
	var greet = greeting[Math.floor(Math.random() * greeting.length)] + '\n';
	var meet = meeting[Math.floor(Math.random() * meeting.length)].replace('[дата]',group.date) + '\n\n';
	var homework = home1.get(student.homework);
	homework = homework.replace('[предмет в им под]', group.subject);
	var koment = '';
	var srezy = '';
	var messrez = '';
	if(student.test >= 0 && student.test <= 10) {
		srezy += itog.replace('[Предмет в им под]',group.subject).replace('[0-10 баллов]',student.test) + '\n';
		messrez = srezs[Math.floor(Math.random() * srezs.length)] + '\n';
	}

	if(student.test >= 0 && student.test < 4.5){
		koment = res1[Math.floor(Math.random() * res1.length)] + '\n\n';
	}else if(student.test >= 4.5 && student.test < 6.5){
		koment = res2[Math.floor(Math.random() * res2.length)] + '\n\n';
	}else if(student.test >= 6.5 && student.test < 8.5){
		koment = res3[Math.floor(Math.random() * res3.length)] + '\n\n';
	}else if(student.test >= 8.5 && student.test <= 10){
		koment = res4[Math.floor(Math.random() * res4.length)] + '\n\n'; 
	}

	koment = koment.replace('[Имя ребенка в им пад]',name.split(' ')[1]);
	var kommentari = srezy? messrez + srezy + '\n' + koment + homework : homework;
	var globalmessage = greet  + name + '\n\n' + meet + kommentari;
	
	return globalmessage;
}

function getMentorNumber(students){
	var workbook1 = xlsx.readFile(path.join(__dirname,'../hh.xlsx'),{cellDates: true});
	var sheetName1 = workbook1.SheetNames[0];
	var worksheet1 = workbook1.Sheets[sheetName1];
	var dataHH = xlsx.utils.sheet_to_json(worksheet1);

	var workbook2 = xlsx.readFile(path.join(__dirname,'../mentor.xlsx'),{cellDates: true});
	var sheetName2 = workbook2.SheetNames[0];
	var worksheet2 = workbook2.Sheets[sheetName2];
	var dataM = xlsx.utils.sheet_to_json(worksheet2);

	students.map(function(student){
		var obj = dataHH.find(elem => elem['ИД клиента'] == student.clientid);
		if(obj){
			var mentor = dataM.find(elem => elem['Ответственный'] == obj['Ответственный']);
			if(mentor){
				student.mentor = mentor['Ответственный'];
				student.tel = mentor['Номер'];
				student.text = 'Я%20тренер%20[тренер],%20пишу%20об%20Айплюсовце%20%0A-%20ФИ:%20[ученик]%20%0A-%20Класс:%20[класс]%20%0A-%20Предмет:%20[пердмет]%0A-%20Группа:%20[группа]%0A';
			}
		}
	});

	return students;
}

function getTimeInMinutes(time){
	var times = time.split(":");
	var hour = parseInt(times[0])*60;
	var minute = parseInt(times[1]);
	var total = hour+minute;

	return total;
}

function compareTimes( a, b ) {
	if ( a.begin < b.begin ){
	  return -1;
	}
	if ( a.begin > b.begin ){
	  return 1;
	}
	if(a.begin == b.begin && a.end < b.end){
		return -1;
	}
	if(a.begin == b.begin && a.end > b.end){
		return 1;
	}
	return 0;
}

function compareReportDate(a, b){
    var date1 = new Date(a.LessonDate);
    var date2 = new Date(b.LessonDate);
    if ( date1 <= date2 ){
        return -1;
      }
      if ( date1 > date2 ){
        return 1;
      }

      return 0;
}

function CalculateDays(registers) {
    var lesson = 0;
    var halflesson = 0;
    var hour = 0;
    var problems = [];
    var hash = new Array();
      var fines = 0;
      registers.map(function(register) {
          if(register.Fine){
              fines+=parseInt(register.Fine);
          }
        if (!(register.LessonDate in hash)) {
          hash[register.LessonDate] = new Array();
          hash[register.LessonDate].push(register.Time);
          var arrTime = register.Time.split("-");
          var arrStart = arrTime[0].split(":");
          var arrEnd = arrTime[1].split(":");
          var time =
            (arrEnd[0] - arrStart[0]) * 60 + (arrEnd[1] - arrStart[1]);

          if (time == 90) {
            if (register.Passed == 0) lesson = lesson + 0.5;
            else lesson = lesson + 1;
          } else if (time == 50 || time == 55 || time == 60) {
            if (register.Passed == 0) hour = hour + 0.5;
            else hour = hour + 1;
          } else if (time == 45 || time == 40){
            if (register.Passed == 0) halflesson = halflesson + 0.5;
            else halflesson = halflesson + 1;
          }else if (time == 120) {
            if (register.Passed == 0) hour = hour + 1;
            else hour = hour + 2;
          }else{
              problems.push(register);
          }
        } else {
          if (!hash[register.LessonDate].includes(register.Time)) {
            hash[register.LessonDate].push(register.Time);
            arrTime = register.Time.split("-");
            arrStart = arrTime[0].split(":");
            arrEnd = arrTime[1].split(":");
            time = (arrEnd[0] - arrStart[0]) * 60 + (arrEnd[1] - arrStart[1]);

            if (time == 90) {
              if (register.Passed == 0) lesson = lesson + 0.5;
              else lesson = lesson + 1;
            } else if (time == 50 || time == 55 || time == 60) {
              if (register.Passed == 0) hour = hour + 0.5;
              else hour = hour + 1;
            } else if (time == 45 || time == 40){
              if (register.Passed == 0) halflesson = halflesson + 0.5;
              else halflesson = halflesson + 1;
            }else if (time == 120) {
              if (register.Passed == 0) hour = hour + 1;
              else hour = hour + 2;
            }else{
              problems.push(register);
            }
          }
        }
      });
      
      return {
              lesson: lesson,
              hour: hour,
              halflesson : halflesson,
              minutes: lesson*90 + hour*60 + halflesson*45,
              problems: problems,
              fines: fines,
      };
  }

  function getDatesInRange(startDate, endDate) {
    const date = new Date(startDate.getTime());
    const dates = [];
    while (date <= endDate) {
      dates.push(new Date(date));
      date.setDate(date.getDate() + 1);
    }
    return dates;
}


module.exports = {
	subjectName,
	getBranch,
	getClass,
	getSubject,
	Capitalize,
	messageDay,
	notificationMessage,
	personalMessage,
	getMentorNumber,
	getWeekDay,
    getTimeInMinutes,
    compareTimes,
    compareReportDate,
    CalculateDays,
    getDatesInRange
}