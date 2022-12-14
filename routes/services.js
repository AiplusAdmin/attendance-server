const express = require('express');
const router = express.Router();
const passport = require('passport');
const jwt = require('jsonwebtoken');
const Promise = require('bluebird');
const Op = require('sequelize').Op;
const { QueryTypes } = require('sequelize');
const bcrypt = require('bcrypt');
const uniqueRandom = require('unique-random');
const QueueBot = require('smart-request-balancer');
const xlsx = require('xlsx');
const path = require('path');
const HashMap = require('hashmap');

const verifyToken = require('../scripts/verifyToken');
const generateKey = require('../scripts/generateKeys');
const api = require('../api/api');
const Registers = require('../modules/Registers');
const BumRegisters = require('../modules/BumRegisters');
const SubRegisters = require('../modules/SubRegisters');
const BumSubRegisters = require('../modules/BumSubRegisters');
const sequelize = require('../databases/index').sequelize;
const Teachers = require('../modules/Teachers');
const Contacts = require('../modules/Contacts');
const Students = require('../modules/Students');
const Schools = require('../modules/Schools');
const Rooms = require('../modules/Rooms');
const TestResults = require('../modules/TestResults');
const Topics = require('../modules/Topics');
const VoksresTests = require('../modules/VoksresTests');
const KolHarTests = require('../modules/KolHarTests');
const Subjects = require('../modules/Subjects');
const Levels = require('../modules/Levels');
const sendMail = require('../scripts/gmail');
const bot = require('../bot/createBot');
const botUtils = require('../bot/botUtils');
const verifyPassword = require('../scripts/verifyPassword');
const aibucksHH = require('../scripts/aibucks');
const hh = require('../scripts/hh');
const hhn = require('../scripts/hhn');
const hht = require('../scripts/hht');
const blocktests = require('../scripts/hhTestsBlock');
const support = require('../scripts/support');
const e = require('express');

const key = {
    "domain": process.env.DOMAIN,
    "apikey": process.env.APIKEY
};

const queueBot = new QueueBot({
	rules:{
		telegramIndividual: {
			rate: 1,    // one message
			limit: 1,   // per second
			priority: 1
		},
		telegramGroup: {
			rate: 20,    // 20 messages
			limit: 60,  // per minute
			priority: 1
		},
		telegramBroadcast: {
			rate: 30,
			limit: 2,
			priority: 2
		}
	},
	default: {                   // Default rules (if provided rule name is not found
		rate: 30,
		limit: 1
	},
	overall:{
		rate: 30,       
		limit: 1
	},
	retryTime: 300,              // Default retry time. Can be configured in retry fn
	ignoreOverallOverheat: false  // Should we ignore overheat of queue itself  
});

function Weekdays(num){
    var weekdays = ['????','????','????','????','????','????','????'];
	var binary = num.toString(2);
	var binary = binary.split("").reverse().join("");
    var idx = binary.indexOf(1);
	var days =[];
    while(idx!=-1){
        days.push(weekdays[idx]);
        idx = binary.indexOf(1, idx + 1);
    }
    return days.join(',');
}

function Weekday(date){
    var weekdays = ['????','????','????','????','????','????','????'];
    var day = new Date(date);

    return weekdays[day.getDay()];
}

function sleep(ms){
    return new Promise(resolve=>{
        setTimeout(resolve,ms)
    });
}

function compareTime(time1,time2){
	var b1 = time1.begin.split(':');
	var b2 = time2.begin.split(':');
	var begin1 = b1[0]*60 + b1[1]*1;
	var begin2 = b2[0]*60 + b2[1]*1;

	if(begin1 < begin2)
		return -1;
	else if(begin1 > begin2)
		return 1;
	else if(begin1 == begin2){
		var e1 =  time1.end.split(':');
		var e2 =  time2.end.split(':');

		var end1 = e1[0]*60 + e1[1]*1;
		var end2 = e2[0]*60 + e2[1]*1;

		if(end1 < end2)
			return -1;
		else if(end1 > end2)
			return 1;
		else 
			return 0
	}
}

function sendTelegramIND(register,student){
	var text;
	var url = 'https://'+process.env.DOMAIN+'.t8s.ru/Learner/Group/'+register.GroupId;
	text = '???? ?????????????????? ???????????? !!!\n';
	text += '\n???????? ??????????: ' + register.LessonDate+'\n\n';
	text += '?????????? ?? ???????????????? ?????????????? ?? ????????????\n ????????????: ' + student.FullName + ' ?? ????????????: Id: '+ register.GroupId + '\n????????????: '+ register.GroupName+'\n??????????????????????????: '+register.TeacherId+'\n??????????: ' + register.Time + '\n??????: '+ register.WeekDays+ '\n\n';
	var com = student.Comment?student.Comment:'';
	text += '???????????????????? ???????????????? :\n?????? : ' + student.FullName + '\n??/??: ' + student.Homework + '\n????????: ' + student.Test+'\n????????: ' + student.Lesson+'\n??????????????????????: ' + com+'\n\n\n';
	queueBot.request((retry) => bot.telegram.sendMessage(process.env.OPERATOR_GROUP_CHATID,text,botUtils.buildUrlButtonOne('???????????? ???? ????????????',url))
	.catch(error => {
		console.log(error);
		if (error.response.status === 429) { // We've got 429 - too many requests
			return retry(error.response.data.parameters.retry_after) // usually 300 seconds
		}
		throw error; // throw error further
	}),process.env.OPERATOR_GROUP_CHATID,'telegramGroup');		
}

//Get Offices
router.get('/offices',verifyToken, (req, res) => {
    api.get(key.domain,'GetOffices','',key.apikey)
        .then((response) => {
			res.json(response);
        })
        .catch(err =>{
            res.json({
				status: 410,
				data: []
			});
        });
});

function sendTelegramGROUP(body){
	var text = '';
	text = '???? ?????????????????? ???????????? !!!\n';
	text+='???????????? ?????????????? ???????????? : \n ?????????????????????????? ID: ' + body.teacherId + '\n ???????? ???????????? ??????????: '+ body.date + '\n ????????????: '+ body.schoolName + '\n????????????: '+ body.groupName+'\n??????????: ' + body.time + '\n\n\n\n';
	queueBot.request((retry) => bot.telegram.sendMessage(process.env.OPERATOR_GROUP_CHATID,text)
	.catch(error => {
		console.log(error);
		if (error.response.status === 429) { // We've got 429 - too many requests
				return retry(error.response.data.parameters.retry_after) // usually 300 seconds
		}
		throw error; // throw error further
	}),process.env.OPERATOR_GROUP_CHATID,'telegramGroup');	
}

//Get Teachers
router.post('/teacher',verifyToken,(req, res) => {
	var params = 'id='+req.body.teacherId;
    api.get(key.domain,'GetTeachers',params,key.apikey)
        .then((response) => {
			res.json(response);    
		})
        .catch(err =>{
            res.json({
				status: 410,
				data: []
			}); 
        });
});

//Log In to System
router.post('/login', async (req, res) => {
	var remember = req.body.remember;
	passport.authenticate('local',(err,user,info) => {
		console.log(user);
		if(err){
			console.log(err);
			res.send({status: 400,message: 'Error'});
		}
			
		
		if(user){
			var exipersIn = '';
			var exp = '';
			if (remember){
				exipersIn = "30 days";
				var now = new Date();
				now.setDate(now.getDate() + 30);
				exp = now.getTime();
			}else{
				exipersIn = "2 days";
				var now = new Date();
				now.setDate(now.getDate() + 2);
				exp = now.getTime();
			} 
				
			const token = jwt.sign({_id: user.teacherId}, process.env.SECRET_KEY,{expiresIn: exipersIn});
			
			res.header('Authorization',token);
			res.json({
				status: 200, 
				data: {
					teacherId: user.teacherId,
					roleId: user.roleId, 
					accesstoken: token,
					exp: exp,
					firstname: user.firstname,
					lastname: user.lastname
				}
			});
		} else
			res.send({status: 404, message: info.message});
	})(req,res);
});

//Get Groups
router.post('/groups',verifyToken, (req, res) => {
	if(req.body.teacherId == undefined){
		res.json({
			status: 401,
			data: []
		});
	} else {
		var params = 'types=Group&timeFrom='+req.body.params.timeFrom+'&timeTo='+req.body.params.timeTo+'&statuses=Working&officeOrCompanyId='+req.body.params.officeId+'&teacherId='+req.body.teacherId;
		var date = Weekday(req.body.params.date);
    	api.get(key.domain,'GetEdUnits',params,key.apikey)
        .then((response) => {
            if(response.status === 200){
				var found = false;
				var i = -1;
				var j = -1;
				response.data.map(function(groups,index){
					groups.ScheduleItems.map(function(ScheduleItem,ind){
						if(ScheduleItem.BeginTime == req.body.params.timeFrom && ScheduleItem.EndTime == req.body.params.timeTo && !ScheduleItem.EndDate){
							var weekdays = Weekdays(ScheduleItem.Weekdays);
							if(weekdays.includes(date)){
								found = true;
								i = index;
								j = ind;
							}
						}
					});
				});
		
				if(found){
					var group = new Object();
					group.Id = response.data[i].Id;
					group.name = response.data[i].Name;
					group.subject = support.Capitalize(support.subjectName(response.data[i].Name));
					group.symbol = support.getSubject(response.data[i].Name);
					group.branch = support.getBranch(response.data[i].Name);
					group.klass = parseInt(support.getClass(response.data[i].Name));
					group.teacher = response.data[i].ScheduleItems[j].Teacher;
					group.time = response.data[i].ScheduleItems[j].BeginTime + '-' + response.data[i].ScheduleItems[j].EndTime;
					group.days = Weekdays(response.data[i].ScheduleItems[j].Weekdays);
					var array = group.days.split(',');
					group.inweek = array.length;
					group.weekdays = response.data[i].ScheduleItems[j].Weekdays;
					
					res.json({status: 200,data: group});
				} else {
					res.json({status: 200,data:{}});
				}
            } else {
				res.json({
					status: 410,
					data: []
				});
			}
        })
        .catch(err =>{
			console.log(err);
            res.json({
				status: 410,
				data: []
			});
        });
	}
});

//Get Groups of Office
router.post('/officegoups',verifyToken, (req, res) => {
	if(req.body.teacherId == undefined){
		res.json({
			status: 401,
			data: []
		});
	} else {
		var date = new Date().toISOString().substr(0, 10);
		var params = 'types=Group&dateFrom='+date+'&dateTo='+date+'&statuses=Working&officeOrCompanyId='+req.body.office.Id+'&teacherId='+req.body.teacherId;
    	api.get(key.domain,'GetEdUnits',params,key.apikey)
        .then((response) => {
            if(response.status === 200){
				var officegroups = [];
				response.data.map(function(group){
					var gr = new Object();
					gr.Id = group.Id;
					gr.name = group.Name;
					gr.subject = support.Capitalize(support.subjectName(group.Name));
					gr.symbol = support.getSubject(group.Name);
					gr.branch = support.getBranch(group.Name);
					gr.klass = parseInt(support.getClass(group.Name));
						
					group.ScheduleItems.map(function(ScheduleItem){
						
						gr.teacher = ScheduleItem.Teacher;
						gr.begin = ScheduleItem.BeginTime;
						gr.end =  ScheduleItem.EndTime;
						gr.time = ScheduleItem.BeginTime + '-' + ScheduleItem.EndTime;
						gr.days = Weekdays(ScheduleItem.Weekdays);
						var array = gr.days.split(',');
						gr.inweek = array.length;
						gr.weekdays = ScheduleItem.Weekdays;
					});
					officegroups.push(gr);
				});
				officegroups.sort(compareTime);

				res.json({status: 200,data: officegroups});
            } else {
				res.json({
					status: 410,
					data: []
				});
			}
        })
        .catch(err =>{
			console.log(err);
            res.json({
				status: 410,
				data: []
			});
        });
	}
});

//Get Student in Group
router.post('/groupstudents',verifyToken, (req, res) => {
	if(req.body.group.Id == undefined){
		res.json({
			status: 401,
			data: []
		});
	} else {
		var params = 'edUnitId=' + req.body.group.Id;
		api.get(key.domain,'GetEdUnitStudents',params,key.apikey)
			.then(async (response) => {
				if(response.status === 200){
					var students = new Array();
					var groupName = response.data[0]?support.getSubject(response.data[0].EdUnitName):null;
					await response.data.reduce(async (previousPromise,student) => {
						await previousPromise;
						return new Promise(async function(resolve,reject){
							if((student.StudyUnits == undefined && student.BeginDate <= req.body.group.date) || student.EndDate >= req.body.group.date){
								
								var obj = new Object();
								obj.clientid = student.StudentClientId;
								obj.name = student.StudentName;
								obj.status = false;
								obj.attendence = false;
								obj.aibaks = 0;
								obj.icon = 'mdi-close-thick';

								var hh = await api.get(key.domain,'GetStudents','clientId='+student.StudentClientId,key.apikey);
								var fields = hh.data[0].ExtraFields?hh.data[0].ExtraFields:[];
								if(hh.data[0].VisitDateTime){
									var date1 = new Date(hh.data[0].VisitDateTime);
									var date2 = new Date(req.body.group.date);
									const diffTime = date1.getTime() - date2.getTime();
									if(diffTime <= 0)
										obj.lessonleft = 0;
									else {
										var array = req.body.group.days.split(',');
										var d = array.findIndex(el => el == support.getWeekDay(req.body.group.date));
										const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
										var inweek = Math.round(diffDays/7);
										obj.lessonleft = (inweek*req.body.group.inweek) - d;
									}
								}

								obj.dynamics = [];
								
								fields.map(field => {
									if(field.Name == '???????????? ????????????????')
										obj.loyalty = field.Value == '?????????????????????????? ??????????????'?0:field.Value == '??????'?2:1;
	
									if(field.Name == '?????? ????????????????' || field.Name == '???????? ????????????????' || field.Name == '?????? ????????????????' || field.Name == '?????? ????????????????'){
										
										var Name = field.Name == '?????? ????????????????' ?'M':field.Name == '???????? ????????????????' ? 'E':field.Name == '?????? ????????????????' ?'R':'K';
										var object = {};
										var arr = obj.dynamics.filter(dynamic => dynamic.Name == Name);
							
										if(arr.length == 1){
											
											var index = obj.dynamics.findIndex(dynamic => dynamic.Name == Name);
											var object = arr[0];
												
											if(groupName == object.Name){
													
												field.Value = field.Value.replace(',','.');
												object.Value = Math.round((Math.abs(field.Value) + Number.EPSILON) * 100) / 100;
											
												if(field.Value >= 0){
													object.progress = 'mdi-arrow-up';
												} else {
													object.progress = 'mdi-arrow-down';
												}
											}
											
											obj.dynamics[index] = object;	
										
										}else {
											
											var object = {};
											object.Name = Name;
	
											if(groupName == object.Name){
												
												field.Value = field.Value.replace(',','.');
												object.Value = `${(Math.round((Math.abs(field.Value) + Number.EPSILON) * 100) / 100)}%`;
												
												if(field.Value >= 0){
													object.progress = 'mdi-chevron-up';
													object.iconcolor = 'green';
												} else {
													object.progress = 'mdi-chevron-down';
													object.iconcolor = 'red';
												}
											}
	
											obj.dynamics.push(object);
										}
									}
									
									if(field.Name == '?????? ??????????????' || field.Name == '?????? ??????????????' || field.Name == '?????? ??????????????' || field.Name == '???????? ??????????????'){
											
										var Name = field.Name == '?????? ??????????????' ?'M':field.Name == '???????? ??????????????' ? 'E':field.Name == '?????? ??????????????' ?'R':'K';
										var arr = obj.dynamics.filter(dynamic => dynamic.Name == Name);
										
										if(arr.length == 1){
												
											var index = obj.dynamics.findIndex(dynamic => dynamic.Name == Name);
											var object = arr[0];
											field.Value = field.Value.replace(',','.');
											
											if(field.Value >= 7.5 && field.Value <= 10)
												object.class = 'group_good';
											else if(field.Value >= 5 && field.Value <= 7.5)
												object.class = 'group_norm';
											else
												object.class = 'group_bad';
												
												obj.dynamics[index] = object;	
								
										} else {
							
											var object = {};
											object.Name = Name;
											field.Value = field.Value.replace(',','.');
				
											if(field.Value >= 7.5 && field.Value <= 10)
												object.class = 'group_good';
											else if(field.Value >= 5 && field.Value <= 7.5)
												object.class = 'group_norm';
											else
												object.class = 'group_bad';
	
											obj.dynamics.push(object);

										}
									}
								});
							
								students.push(obj); 
							}
						
							resolve(true);
						});
					},Promise.resolve(true));

					students = support.getMentorNumber(students);
					res.send({
						status: 200,
						data: students
					});
				} else {
					res.json({
						status: 410,
						data: []
					});
				}
			})
			.catch(err =>{
				console.log(err);
				res.json({
					status: 410,
					data: []
				});
			});
	}
});

//Get Student
router.post('/student',verifyToken, async (req,res) => {
	try{
		var fullname = req.body.student.value.split(' ');
		var student = await Students.findOne({
			where:{
				LastName: fullname[0],
				FirstName: fullname[1],
				MiddleName: fullname[2]?fullname[2]:''
			},
			attributes: ['ClientId']
		});
		if(student === null){
			res.json({
				status: 404,
				message: '?????????????? ??????'
			});
		} else {
			res.json({
				status: 200,
				data: student.ClientId
			});
		}
	}catch(error){
		res.json({
			status: 500,
			message: 'Error'
		});
	}
});

//Add student passes
router.post('/setpasses',verifyToken, (req, res) => {
    var data = req.body.date;
    var groupId = req.body.groupId;
    var students = req.body.students;
    var params = new Array();
    students.map(function(student){
        if(student.clientId != -1 && !student.status && !student.delete){
            var st = new Object();
            st.Date = data;
            st.EdUnitId = groupId;
            st.StudentClientId = student.clientid;
            st.Pass = !student.attendence;
            st.Payable = false;
            params.push(st);
        }
    });
    api.post(key.domain,'SetStudentPasses',params,key.apikey)
    .then((response) => {
		res.json(response);
	})
    .catch(err =>{
		console.log(err);		
        res.json({
			status: 500,
			message: 'Error'
		});
    });
});

//time check
router.post('/timecheck', async (req, res) => { 
	var timeStartNew = req.body.beginTime;
	var timeEndNew = req.body.endTime;
	if(req.body.teacherId == undefined){
		res.json({
			status: 401,
			data: []
		});
	} else {

		var date = new Date().toISOString().substr(0, 10);
		var timeStart = new Date("01/01/1970" + " " + timeStartNew);		
		var timeEnd = new Date("01/01/1970" + " " + timeEndNew);
		var params = 'types=Group&dateFrom='+date+'&dateTo='+date+'&statuses=Working&teacherId='+req.body.teacherId;
    	var response = await api.get(key.domain,'GetEdUnits',params,key.apikey);
        try{
            if(response.status === 200){
				var ok = true;
				for(var i = 0; i < response.data.length; i++){
					for(var j = 0; j < response.data[i].ScheduleItems.length; j++){
						var begin = response.data[i].ScheduleItems[j].BeginTime;
						var end =  response.data[i].ScheduleItems[j].EndTime;
						var timeStartGroup = new Date("01/01/1970" + " " + begin);		
						var timeEndGroup = new Date("01/01/1970" + " " + end);

						if ((timeStartGroup < timeStart && timeStartGroup < timeEnd) && (timeEndGroup <= timeStart && timeEndGroup < timeEnd)){
							continue
						} else if(((timeStartGroup > timeStart && timeStartGroup >= timeEnd) && (timeEndGroup > timeStart && timeEndGroup > timeEnd))){
							continue
						}else{
							ok = false;
							break;	
						}		
					}
					if(!ok) break;
				}

				if(!ok){
					res.json({
						status: 440,
						message: '?? ???????????? ?????????? ?? ?????? ?????? ???????? ????????'
					});
				}else{
					res.json({
						status: 200,
						message: 'OK'
					});
				}
            } else {
				res.json({
					status: 410,
					data: []
				});
			}
        }catch(err){
			console.log(err);
            res.json({
				status: 410,
				data: []
			});
        }
	}
});

//add attendence test
router.post('/setattendence', async (req, res) => { 
	try{
		var students = req.body.students;
		var group  = req.body.group;
		var TeacherId = req.body.group.teacherId;
		var SubTeacherId = req.body.group.subteacherId;
		var Change = req.body.group.change;
		var GroupId = req.body.group.Id;
		var GroupName = req.body.group.name;
		var Time = req.body.group.time;
		var LessonDate = req.body.group.date.substr(0, 10);
		var WeekDays = req.body.group.days;
		var SubmitDay = req.body.submitDay.substr(0, 10);
		var SubmitTime = req.body.submitTime;
		var IsSubmitted = req.body.isSubmitted;
		var IsStudentAdd = req.body.group.isStudentAdd ? req.body.group.isStudentAdd:false;
		var IsOperator = req.body.group.isOperator ? req.body.group.isOperator:false;
		var SchoolId = req.body.group.officeId;
		var RoomId = req.body.group.roomId;
		var LevelTest = req.body.group.level;
		var Aibucks = req.body.Aibucks?req.body.Aibucks:null;
		var TopicId = req.body.topic ? req.body.topic.Id: null;
		var homework = req.body.homework ? req.body.homework : null;
		var kolhar = req.body.kolhar;
		var foskres = req.body.foskres;
		var subject = req.body.group.subject;
		var HomeWorkComment = '';
		var bumFlag = req.body.bumFlag;
		var Paperdone = !bumFlag;
		var newRegister;
		if(bumFlag){
			newRegister = await BumRegisters.create({
				Change,
				LevelTest,
				RoomId,
				SubTeacherId,
				TeacherId,
				GroupId,
				GroupName,
				Time,
				LessonDate,
				WeekDays,
				SubmitDay,
				SubmitTime,
				IsSubmitted,
				IsStudentAdd,
				IsOperator,
				SchoolId,
				Aibucks,
				TopicId,
				Paperdone
			},{
				fields:['Change','LevelTest','RoomId','SubTeacherId','TeacherId','GroupId','GroupName','Time','LessonDate','WeekDays','SubmitDay','SubmitTime','IsSubmitted','IsStudentAdd','IsOperator','SchoolId','Aibucks','TopicId','Paperdone']
			});
		}else{
			newRegister = await Registers.create({
				Change,
				LevelTest,
				RoomId,
				SubTeacherId,
				TeacherId,
				GroupId,
				GroupName,
				Time,
				LessonDate,
				WeekDays,
				SubmitDay,
				SubmitTime,
				IsSubmitted,
				IsStudentAdd,
				IsOperator,
				SchoolId,
				Aibucks,
				TopicId
			},{
				fields:['Change','LevelTest','RoomId','SubTeacherId','TeacherId','GroupId','GroupName','Time','LessonDate','WeekDays','SubmitDay','SubmitTime','IsSubmitted','IsStudentAdd','IsOperator','SchoolId','Aibucks','TopicId']
			});
		}
		if(newRegister){ 
			var subregisters = [];
			var voksrestests = [];
			var kolhartest = [];
			students.map(function(student){
				if(!student.delete){
					var obj = {};
					var kolobj = {};
					var voksresobj = {};
					var comment = '';
					if(student.comment){
						comment = student.comment.join('\n');
					}
					
					obj.RegisterId = newRegister.Id;
					obj.ClientId = student.clientid;
					obj.FullName = student.name;
					obj.Pass = student.attendence;
					obj.Homework = student.attendence?student.homework:-1;
					obj.Test = student.attendence?student.test:-1;
					obj.Lesson = student.attendence?student.lesson:-1;
					obj.Comment = comment;
					obj.Status = student.status;
					obj.isWatched = student.iswatched ? student.iswatched:false;
					obj.Aibucks = student.aibaks ? student.aibaks : 0;
	
					if(kolhar && student.attendence){
						kolobj.ClientId = student.clientid;
						kolobj.Score = student.kolhar;
						kolobj.LessonDay = LessonDate;
						kolobj.SubmitDay = SubmitDay;

						kolhartest.push(kolobj);
					}

					if(foskres && student.attendence){
						voksresobj.ClientId = student.clientid;
						voksresobj.Score = student.foskres;
						voksresobj.Subject = subject;
						voksresobj.LessonDay = LessonDate;
						voksresobj.SubmitDay = SubmitDay;

						voksrestests.push(voksresobj);
					}

					subregisters.push(obj);
				}
			});
			if(kolhar){
				KolHarTests.bulkCreate(kolhartest,{
					fields: ['ClientId','LessonDay','SubmitDay','Score']
				});
			}
			
			if(foskres){
				VoksresTests.bulkCreate(voksrestests,{
					fields: ['ClientId','Subject','LessonDay','SubmitDay','Score']
				});
			}

			var result;

			if(bumFlag){
				result = await BumSubRegisters.bulkCreate(subregisters,{
					fields:['RegisterId','ClientId','FullName','Pass','Homework','Test','Lesson','Comment','Status','isWatched','Aibucks']
				});
			}else{
				result = await SubRegisters.bulkCreate(subregisters,{
					fields:['RegisterId','ClientId','FullName','Pass','Homework','Test','Lesson','Comment','Status','isWatched','Aibucks']
				});
			}
			
			
			if(result.length > 0){
				new Promise(async (resolve) => {
					try{
						await hh(LessonDate,GroupId,students,newRegister);
						resolve(true);
					}catch(err){
						console.log(err);
						resolve(true);
					}
				});
				new Promise(async (resolve) => {
					try{
						await aibucksHH(students);
						resolve(true);
					}catch(err){
						console.log(err);
						resolve(true);
					}
				});
				if(!bumFlag){
					new Promise(async (resolve) =>{
						try{
							if(group.change){
								var url = `https://${process.env.DOMAIN}.t8s.ru/Learner/Group/${group.Id}`;
								var text = '';
								text+='???????? ???????????? : \n ???????????????????? ??????????????????????????: ' + req.body.teacherName + '\n???????????????????? ??????????????????????????: ' + group.teacher + '\n ???????? ????????????: '+ group.date +'\n????????????: Id: '+ group.Id + '\n????????????: '+ group.name+'\n??????????????????????????: '+group.teacher+'\n??????????: ' + group.time + '\n??????: '+ group.days+ '\n\n\n';
								queueBot.request((retry) => bot.telegram.sendMessage(process.env.OPERATOR_GROUP_CHATID,text,botUtils.buildUrlButtonOne('???????????? ???? ????????????',url))
								.catch(error => {
									console.log(error);
									if (error.response.status === 429) { // We've got 429 - too many requests
											return retry(error.response.data.parameters.retry_after) // usually 300 seconds
									}
									throw error; // throw error further
								}),process.env.OPERATOR_GROUP_CHATID,'telegramGroup');
							}
							
							
							var deleteStudents = [];
							var addStudents = [];
							req.body.students.map(async function(student){
								if(student.delete){
									deleteStudents.push(student);
								}
								
								if(student.status && student.attendence){
									addStudents.push(student.name)
								}
							});
							await sleep(1000);
							if(deleteStudents.length > 0){

								deleteStudents.reduce(async function(previousPromise, student){
									await previousPromise;

									return new Promise(async function(resolve,reject){
										var data = new Object();
										data.edUnitId = group.Id;
										data.studentClientId = student.clientid;
										var today = new Date();
										today.setDate(today.getDate()-1);
										data.end = today.toISOString().substring(0,10);
										await api.post(key.domain,'EditEdUnitStudent',data,key.apikey);
										
										var groups = await api.get(key.domain,'GetEdUnitStudents','studentClientId='+ student.clientid,key.apikey);
										
										if(groups.status == 200){
											
											var filter = groups.data.filter(el => el.EndDate > today || !el.EndDate);

											if(filter.length == 0){
												var obj = new Object();
												var executorIds = [];
												executorIds.push(18423);
												obj.Date = today.toISOString();
												obj.ExecutorIds = executorIds;
												obj.ClientId = student.clientid;
												obj.DescriptionHtml = "?????????????????? ???????????? ???????????????? ???????????????? ? ???????? ??????, ???????????????? ?? ????????????.";
												await api.post(key.domain,'EditEdUnitStudent',obj,key.apikey);
											}
										}
										
										resolve(true);
									});
								},Promise.resolve(true));

						
							}
							await sleep(1000);
							if(addStudents.length > 0){
								var url = `https://${process.env.DOMAIN}.t8s.ru/Learner/Group/${group.Id}`;
								var text = '';
								text = '???????? ??????????: ' + group.date+'\n\n';
								text += '?????????? ?? ???????????????? ???????????????? ?? ????????????\n\n ????????????:\nId: '+ group.Id + '\n??????: '+ group.name+'\n??????????????????????????: '+group.teacher+'\n??????????: ' + group.time + '\n??????: '+ group.days+ '\n\n';
								var sts = addStudents.join('\n');
								text += '???????????? ????????????????:\n' + sts;
								queueBot.request((retry) => bot.telegram.sendMessage(process.env.OPERATOR_GROUP_CHATID,text,botUtils.buildUrlButtonOne('???????????? ???? ????????????',url))
								.catch(error => {
									console.log(error);
									if (error.response.status === 429) { // We've got 429 - too many requests
										return retry(error.response.data.parameters.retry_after) // usually 300 seconds
									}
									throw error; // throw error further
								}),process.env.OPERATOR_GROUP_CHATID,'telegramGroup');
							}
						}catch(err){
							console.log(err);
							resolve(true);
						}
					});
				}else{
					var students = req.body.students.map(st => st.name);
					var text = '';
					text+='???????????? ?????????????? ???????????? : \n ??????????????????????????: ' + req.body.group.teacher + '\n ???????? ???????????? ??????????: '+ req.body.group.date +'\n ??????????: '+
						req.body.group.klass+'\n ??????????????: '+ req.body.group.subject+'\n ??????????: ' + req.body.group.time + '\n ????????????: ' + req.body.group.officeName+'\n ?????? ????????????????: '+ req.body.group.days + '\n\n\n';
					text+='?????????????? : \n' + students.join('\n');
					queueBot.request((retry) => bot.telegram.sendMessage(process.env.OPERATOR_GROUP_CHATID,text)
					.catch(error => {
						console.log(error);
						if (error.response.status === 429) { // We've got 429 - too many requests
								return retry(error.response.data.parameters.retry_after) // usually 300 seconds
						}
						throw error; // throw error further
					}),process.env.OPERATOR_GROUP_CHATID,'telegramGroup');
				}
		
				res.json({
					status: 200,
					message: 'OK'				
				});
			}else {
				res.json({
					status: 500,
					message: 'Error'
				});
			}
		}else {
			res.json({
				status: 500,
				message: 'Error'
			});
		}
	}catch(error){
		console.log(error);
		res.json({
			status: 500,
			message: 'Error'
		});
	}
});

router.post('/setattendencet', async (req, res) => { 
	try{
		var students = req.body.students;
		var group  = req.body.group;
		var TeacherId = req.body.group.teacherId;
		var SubTeacherId = req.body.group.subteacherId;
		var Change = req.body.group.change;
		var GroupId = req.body.group.Id;
		var GroupName = req.body.group.name;
		var Time = req.body.group.time;
		var LessonDate = req.body.group.date.substr(0, 10);
		var WeekDays = req.body.group.days;
		var SubmitDay = req.body.submitDay.substr(0, 10);
		var SubmitTime = req.body.submitTime;
		var IsSubmitted = req.body.isSubmitted;
		var IsStudentAdd = req.body.group.isStudentAdd ? req.body.group.isStudentAdd:false;
		var IsOperator = req.body.group.isOperator ? req.body.group.isOperator:false;
		var SchoolId = req.body.group.officeId;
		var RoomId = req.body.group.roomId;
		var LevelTest = req.body.group.level;
		var Aibucks = req.body.Aibucks?req.body.Aibucks:null;
		var TopicId = req.body.topic ? req.body.topic.Id: null;
		var TopicPriority = req.body.topic ? req.body.topic.Priority : 0;
		var TopicName =  req.body.topic ? req.body.topic.Name: "";
		var homework = req.body.homework ? req.body.homework : null;
		var block = req.body.Block;
		var kolhar = req.body.kolhar;
		var foskres = req.body.foskres;
		var subject = req.body.group.subject;
		var srezMaxDefault = req.body.srezMaxDefault ? parseInt(req.body.srezMaxDefault):0;
		var bumFlag = req.body.bumFlag;
		var Paperdone = !bumFlag;
		var newRegister;


		if(bumFlag){
			newRegister = await BumRegisters.create({
				Change,
				LevelTest,
				RoomId,
				SubTeacherId,
				TeacherId,
				GroupId,
				GroupName,
				Time,
				LessonDate,
				WeekDays,
				SubmitDay,
				SubmitTime,
				IsSubmitted,
				IsStudentAdd,
				IsOperator,
				SchoolId,
				Aibucks,
				TopicId,
				Paperdone
			},{
				fields:['Change','LevelTest','RoomId','SubTeacherId','TeacherId','GroupId','GroupName','Time','LessonDate','WeekDays','SubmitDay','SubmitTime','IsSubmitted','IsStudentAdd','IsOperator','SchoolId','Aibucks','TopicId','Paperdone']
			});
		}else{
			newRegister = await Registers.create({
				Change,
				LevelTest,
				RoomId,
				SubTeacherId,
				TeacherId,
				GroupId,
				GroupName,
				Time,
				LessonDate,
				WeekDays,
				SubmitDay,
				SubmitTime,
				IsSubmitted,
				IsStudentAdd,
				IsOperator,
				SchoolId,
				Aibucks,
				TopicId
			},{
				fields:['Change','LevelTest','RoomId','SubTeacherId','TeacherId','GroupId','GroupName','Time','LessonDate','WeekDays','SubmitDay','SubmitTime','IsSubmitted','IsStudentAdd','IsOperator','SchoolId','Aibucks','TopicId']
			});
		}
		if(newRegister){ 
			var subregisters = [];
			var voksrestests = [];
			var kolhartest = [];
			students.map(function(student){
				if(!student.delete){
					var obj = {};
					var kolobj = {};
					var voksresobj = {};
					var comment = '';
	
					if(student.comment){
						comment = student.comment.join('\n');
						student.comment.unshift(TopicName + '<br/>');
					}else{
						student.comment = [];
						student.comment.push(TopicName + '<br/>');
					}
					student.maxsrez = srezMaxDefault;
						
					obj.RegisterId = newRegister.Id;
					obj.ClientId = student.clientid;
					obj.FullName = student.name;
					obj.Pass = student.attendence;
					obj.Homework = student.homework;
					obj.Test = student.test;
					obj.Lesson = student.attendence?student.lesson:0;
					obj.Comment = comment;
					obj.Status = student.status;
					obj.isWatched = student.iswatched ? student.iswatched:false;
					obj.Aibucks = student.aibaks ? student.aibaks : 0;
					obj.SubjectN = TopicPriority;
					obj.TestMax = srezMaxDefault;
					
					subregisters.push(obj);
					
					if(kolhar && student.attendence){
						kolobj.ClientId = student.clientid;
						kolobj.Score = student.kolhar;
						kolobj.LessonDay = LessonDate;
						kolobj.SubmitDay = SubmitDay;

						kolhartest.push(kolobj);
					}

					if(foskres){
						voksresobj.ClientId = student.clientid;
						voksresobj.Score = student.foskres;
						voksresobj.Block = block;
						voksresobj.Subject = subject;
						voksresobj.LessonDay = LessonDate;
						voksresobj.SubmitDay = SubmitDay;

						voksrestests.push(voksresobj);
					}
				}
			});
			if(kolhar){
				KolHarTests.bulkCreate(kolhartest,{
					fields: ['ClientId','LessonDay','SubmitDay','Score']
				});
			}
			if(foskres){
				VoksresTests.bulkCreate(voksrestests,{
					fields: ['ClientId','Subject','LessonDay','SubmitDay','Score']
				});
				blocktests(voksrestests);
			}

			var result;
			
			if(bumFlag){
				result = await BumSubRegisters.bulkCreate(subregisters,{
					fields:['RegisterId','ClientId','FullName','Pass','Homework','Test','Lesson','Comment','Status','isWatched','Aibucks','SubjectN']
				});
			}else{
				result = await SubRegisters.bulkCreate(subregisters,{
					fields:['RegisterId','ClientId','FullName','Pass','Homework','Test','Lesson','Comment','Status','isWatched','Aibucks','SubjectN']
				});
			}
			if(result.length > 0){
				new Promise(async (resolve) => {
					try{
						if(GroupId && !bumFlag){
							await hht(LessonDate,GroupId,students,newRegister,TopicPriority);
							resolve(true);
						}
					}catch(err){
						console.log(err);
						resolve(true);
					}
				});
				new Promise(async (resolve) => {
					try{
						if(GroupId){
						await aibucksHH(students);
						resolve(true);
						}
					}catch(err){
						console.log(err);
						resolve(true);
					}
				});
				if(!bumFlag){
					new Promise(async (resolve) =>{
						try{
							if(group.change){
								var url = `https://${process.env.DOMAIN}.t8s.ru/Learner/Group/${group.Id}`;
								var text = '';
								text+='???????? ???????????? : \n ???????????????????? ??????????????????????????: ' + req.body.teacherName + '\n???????????????????? ??????????????????????????: ' + group.teacher + '\n ???????? ????????????: '+ group.date +'\n????????????: Id: '+ group.Id + '\n????????????: '+ group.name+'\n??????????????????????????: '+group.teacher+'\n??????????: ' + group.time + '\n??????: '+ group.days+ '\n\n\n';
								queueBot.request((retry) => bot.telegram.sendMessage(process.env.OPERATOR_GROUP_CHATID,text,botUtils.buildUrlButtonOne('???????????? ???? ????????????',url))
								.catch(error => {
									console.log(error);
									if (error.response.status === 429) { // We've got 429 - too many requests
											return retry(error.response.data.parameters.retry_after) // usually 300 seconds
									}
									throw error; // throw error further
								}),process.env.OPERATOR_GROUP_CHATID,'telegramGroup');
							}
								
							var deleteStudents = [];
							var addStudents = [];
							req.body.students.map(async function(student){
								if(student.delete){
									deleteStudents.push(student);
								}
								
								if(student.status && student.attendence){
									addStudents.push(student.name)
								}
							});
							await sleep(1000);
							if(deleteStudents.length > 0){
								deleteStudents.reduce(async function(previousPromise, student){
									await previousPromise;

									return new Promise(async function(resolve,reject){
										var data = new Object();
										data.edUnitId = group.Id;
										data.studentClientId = student.clientid;
										var today = new Date();
										today.setDate(today.getDate()-1);
										data.end = today.toISOString().substring(0,10);
										await api.post(key.domain,'EditEdUnitStudent',data,key.apikey);
										
										var groups = await api.get(key.domain,'GetEdUnitStudents','studentClientId='+ student.clientid,key.apikey);
										if(groups.status == 200){											
											var filter = groups.data.filter(el => el.EndDate > today || !el.EndDate); //changes
											if(filter.length == 0){
												var obj = new Object();
												var executorIds = [];
												executorIds.push(process.env.OPERATOR_ID);
												obj.Date = today.toISOString();
												obj.ExecutorIds = executorIds;
												obj.ClientId = student.clientid;
												obj.DescriptionHtml = "?????????????????? ???????????? ???????????????? ???????????????? ? ???????? ??????, ???????????????? ?? ????????????.";
												await api.post(key.domain,'AddTask',obj,key.apikey);
											}
										}

										resolve(true);
									});
								},Promise.resolve(true));
							}
							await sleep(1000);
							if(addStudents.length > 0){
								var url = `https://${process.env.DOMAIN}.t8s.ru/Learner/Group/${group.Id}`;
								var text = '';
								text = '???????? ??????????: ' + group.date+'\n\n';
								text += '?????????? ?? ???????????????? ???????????????? ?? ????????????\n\n ????????????:\nId: '+ group.Id + '\n??????: '+ group.name+'\n??????????????????????????: '+group.teacher+'\n??????????: ' + group.time + '\n??????: '+ group.days+ '\n\n';
								var sts = addStudents.join('\n');
								text += '???????????? ????????????????:\n' + sts;
								queueBot.request((retry) => bot.telegram.sendMessage(process.env.OPERATOR_GROUP_CHATID,text,botUtils.buildUrlButtonOne('???????????? ???? ????????????',url))
								.catch(error => {
									console.log(error);
									if (error.response.status === 429) { // We've got 429 - too many requests
										return retry(error.response.data.parameters.retry_after) // usually 300 seconds
									}
									throw error; // throw error further
								}),process.env.OPERATOR_GROUP_CHATID,'telegramGroup');
							}
						}catch(err){
							console.log(err);
							resolve(true);
						}
					});
				}else{
					var students = req.body.students.map(st => st.name);
					var text = '';
					text+='???????????? ?????????????? ???????????? : \n ??????????????????????????: ' + req.body.group.teacher + '\n ???????? ???????????? ??????????: '+ req.body.group.date +'\n ??????????: '+
						req.body.group.klass+'\n ??????????????: '+ req.body.group.subject+'\n ??????????: ' + req.body.group.time + '\n ????????????: ' + req.body.group.officeName+'\n ?????? ????????????????: '+ req.body.group.days + '\n\n\n';
					text+='?????????????? : \n' + students.join('\n');
					queueBot.request((retry) => bot.telegram.sendMessage(process.env.OPERATOR_GROUP_CHATID,text)
					.catch(error => {
						console.log(error);
						if (error.response.status === 429) { // We've got 429 - too many requests
								return retry(error.response.data.parameters.retry_after) // usually 300 seconds
						}
						throw error; // throw error further
					}),process.env.OPERATOR_GROUP_CHATID,'telegramGroup');
				}

				res.json({
					status: 200,
					message: 'OK'				
				});
			}else {
				res.json({
					status: 500,
					message: 'Error'
				});
			}
		}else {
			res.json({
				status: 500,
				message: 'Error'
			});
		}
	}catch(error){
		console.log(error);
		res.json({
			status: 500,
			message: 'Error'
		});
	}
});

router.post('/setattendencen', async (req, res) => { 
	try{
		var students = req.body.students;
		var group  = req.body.group;
		var TeacherId = req.body.group.teacherId;
		var SubTeacherId = req.body.group.subteacherId;
		var Change = req.body.group.change;
		var GroupId = req.body.group.Id;
		var GroupName = req.body.group.name;
		var Time = req.body.group.time;
		var LessonDate = req.body.group.date.substr(0, 10);
		var WeekDays = req.body.group.days;
		var SubmitDay = req.body.submitDay.substr(0, 10);
		var SubmitTime = req.body.submitTime;
		var IsSubmitted = req.body.isSubmitted;
		var IsStudentAdd = req.body.group.isStudentAdd ? req.body.group.isStudentAdd:false;
		var IsOperator = req.body.group.isOperator ? req.body.group.isOperator:false;
		var SchoolId = req.body.group.officeId;
		var RoomId = req.body.group.roomId;
		var LevelTest = req.body.group.level;
		var Aibucks = req.body.Aibucks?req.body.Aibucks:null;
		var subject = req.body.theme;
		var bumFlag = req.body.bumFlag;
		var Paperdone = !bumFlag;
		var newRegister;
		if(bumFlag){
			newRegister = await BumRegisters.create({
				Change,
				LevelTest,
				RoomId,
				SubTeacherId,
				TeacherId,
				GroupId,
				GroupName,
				Time,
				LessonDate,
				WeekDays,
				SubmitDay,
				SubmitTime,
				IsSubmitted,
				IsStudentAdd,
				IsOperator,
				SchoolId,
				Aibucks,
				Paperdone
			},{
				fields:['Change','LevelTest','RoomId','SubTeacherId','TeacherId','GroupId','GroupName','Time','LessonDate','WeekDays','SubmitDay','SubmitTime','IsSubmitted','IsStudentAdd','IsOperator','SchoolId','Aibucks','Paperdone']
			});
		}else{
			newRegister = await Registers.create({
					Change,
					LevelTest,
					RoomId,
					SubTeacherId,
					TeacherId,
					GroupId,
					GroupName,
					Time,
					LessonDate,
					WeekDays,
					SubmitDay,
					SubmitTime,
					IsSubmitted,
					IsStudentAdd,
					IsOperator,
					SchoolId,
					Aibucks
			},{
				fields:['Change','LevelTest','RoomId','SubTeacherId','TeacherId','GroupId','GroupName','Time','LessonDate','WeekDays','SubmitDay','SubmitTime','IsSubmitted','IsStudentAdd','IsOperator','SchoolId','Aibucks']
			});
		}
		if(newRegister){ 
			var subregisters = [];
			students.map(function(student){
				if(!student.delete){
					var obj = {};
					var comment = '';
					if(student.comment){
						comment = student.comment.join('\n');
					}
					

					obj.RegisterId = newRegister.Id;
					obj.ClientId = student.clientid;
					obj.FullName = student.name;
					obj.Pass = student.attendence;
					obj.Homework = student.attendence?student.homework:-1;
					obj.Test = student.attendence?student.test:-1;
					obj.Lesson = student.attendence?student.lesson:-1;
					obj.Comment = comment;
					obj.Status = student.status;
					obj.isWatched = student.iswatched ? student.iswatched:false;
					obj.Aibucks = student.aibaks ? student.aibaks : 0;
					obj.SubjectN = subject;
	

					subregisters.push(obj);
				}
			});
			

			var result;
			if(bumFlag){
				result = await BumSubRegisters.bulkCreate(subregisters,{
					fields:['RegisterId','ClientId','FullName','Pass','Homework','Test','Lesson','Comment','Status','isWatched','Aibucks','SubjectN']
				});
			}else{
				result = await SubRegisters.bulkCreate(subregisters,{
					fields:['RegisterId','ClientId','FullName','Pass','Homework','Test','Lesson','Comment','Status','isWatched','Aibucks','SubjectN']
				});
			}
			if(result.length > 0){
				new Promise(async (resolve) => {
					try{
						if(GroupId && !bumFlag){
							await hhn(LessonDate,GroupId,students,newRegister,subject);
						}
						resolve(true);
					}catch(err){
						console.log(err);
						resolve(true);
					}
				});
				new Promise(async (resolve) => {
					try{
						await aibucksHH(students);
						resolve(true);
					}catch(err){
						console.log(err);
						resolve(true);
					}
				});
				new Promise(async (resolve) =>{
					try{
						if(!bumFlag){
							if(group.change){
								var url = `https://${process.env.DOMAIN}.t8s.ru/Learner/Group/${group.Id}`;
								var text = '';
								text+='???????? ???????????? : \n ???????????????????? ??????????????????????????: ' + req.body.teacherName + '\n???????????????????? ??????????????????????????: ' + group.teacher + '\n ???????? ????????????: '+ group.date +'\n????????????: Id: '+ group.Id + '\n????????????: '+ group.name+'\n??????????????????????????: '+group.teacher+'\n??????????: ' + group.time + '\n??????: '+ group.days+ '\n\n\n';
								queueBot.request((retry) => bot.telegram.sendMessage(process.env.OPERATOR_GROUP_CHATID,text,botUtils.buildUrlButtonOne('???????????? ???? ????????????',url))
								.catch(error => {
									console.log(error);
									if (error.response.status === 429) { // We've got 429 - too many requests
											return retry(error.response.data.parameters.retry_after) // usually 300 seconds
									}
									throw error; // throw error further
								}),process.env.OPERATOR_GROUP_CHATID,'telegramGroup');
							}
									
							var deleteStudents = [];
							var addStudents = [];
							req.body.students.map(async function(student){
								if(student.delete){
									deleteStudents.push(student);
								}
								
								if(student.status && student.attendence){
									addStudents.push(student.name)
								}
							});

							await sleep(1000);
							if(deleteStudents.length > 0){
								deleteStudents.reduce(async function(previousPromise, student){
									await previousPromise;

									return new Promise(async function(resolve,reject){
										var data = new Object();
										data.edUnitId = group.Id;
										data.studentClientId = student.clientid;
										var today = new Date();
										today.setDate(today.getDate()-1);
										data.end = today.toISOString().substring(0,10);
										await api.post(key.domain,'EditEdUnitStudent',data,key.apikey);
										var dataStatus = new Object()
										dataStatus.ClientId = student.clientid;
										dataStatus.statusName = '??????????????????????';
										await api.post(key.domain,'SetClientStatus',dataStatus,key.apikey);
										
										resolve(true);
									});
								},Promise.resolve(true));
							}
							await sleep(1000);
							if(addStudents.length > 0){
								var url = `https://${process.env.DOMAIN}.t8s.ru/Learner/Group/${group.Id}`;
								var text = '';
								text = '???????? ??????????: ' + group.date+'\n\n';
								text += '?????????? ?? ???????????????? ???????????????? ?? ????????????\n\n ????????????:\nId: '+ group.Id + '\n??????: '+ group.name+'\n??????????????????????????: '+group.teacher+'\n??????????: ' + group.time + '\n??????: '+ group.days+ '\n\n';
								var sts = addStudents.join('\n');
								text += '???????????? ????????????????:\n' + sts;
								queueBot.request((retry) => bot.telegram.sendMessage(process.env.OPERATOR_GROUP_CHATID,text,botUtils.buildUrlButtonOne('???????????? ???? ????????????',url))
								.catch(error => {
									console.log(error);
									if (error.response.status === 429) { // We've got 429 - too many requests
										return retry(error.response.data.parameters.retry_after) // usually 300 seconds
									}
									throw error; // throw error further
								}),process.env.OPERATOR_GROUP_CHATID,'telegramGroup');
							}
						}else{
							var studentsGroup = req.body.students.map(st => st.name);
							var text = '';
							text+='???????????? ?????????????? ???????????? : \n ??????????????????????????: ' + req.body.group.teacher + '\n ???????? ???????????? ??????????: '+ req.body.group.date +'\n ??????????: '+
								req.body.group.klass+'\n ??????????????: '+ req.body.group.subject+'\n ??????????: ' + req.body.group.time + '\n ????????????: ' + req.body.group.officeName+'\n ?????? ????????????????: '+ req.body.group.days + '\n\n\n';
							text+='?????????????? : \n' + studentsGroup.join('\n');
							queueBot.request((retry) => bot.telegram.sendMessage(process.env.OPERATOR_GROUP_CHATID,text)
							.catch(error => {
								console.log(error);
								if (error.response.status === 429) { // We've got 429 - too many requests
										return retry(error.response.data.parameters.retry_after) // usually 300 seconds
								}
								throw error; // throw error further
							}),process.env.OPERATOR_GROUP_CHATID,'telegramGroup');
						}
					}catch(err){
						console.log(err);
						resolve(true);
					}
				});
				res.json({
					status: 200,
					message: 'OK'				
				});
			}else {
				res.json({
					status: 500,
					message: 'Error'
				});
			}
		}else {
			res.json({
				status: 500,
				message: 'Error'
			});
		}
	}catch(error){
		console.log(error);
		res.json({
			status: 500,
			message: 'Error'
		});
	}
});

// send message to telegram group
router.post('/sendmessagetelegram',(req,res) => {
	var url = `https://${process.env.DOMAIN}.t8s.ru/Learner/Group/${req.body.group.Id}`;
	if(req.body.group.change){
		var text = '';
		text+='???????? ???????????? : \n ???????????????????? ??????????????????????????: ' + req.body.teacherName + '\n???????????????????? ??????????????????????????: ' + req.body.group.teacher + '\n ???????? ????????????: '+ req.body.group.date +'\n????????????: Id: '+ req.body.group.Id + '\n????????????: '+ req.body.group.name+'\n??????????????????????????: '+req.body.group.teacher+'\n??????????: ' + req.body.group.time + '\n??????: '+ req.body.group.days+ '\n\n\n';
		queueBot.request((retry) => bot.telegram.sendMessage(process.env.OPERATOR_GROUP_CHATID,text,botUtils.buildUrlButtonOne('???????????? ???? ????????????',url))
		.catch(error => {
			console.log(error);
			if (error.response.status === 429) { // We've got 429 - too many requests
					return retry(error.response.data.parameters.retry_after) // usually 300 seconds
			}
			throw error; // throw error further
		}),process.env.OPERATOR_GROUP_CHATID,'telegramGroup');
	}

	req.body.students.map(async function(student){
		if(student.delete){
			var text = '';
			text = '???????? ??????????: ' + req.body.group.date+'\n\n';
			text += '???????????? ???????????? ?? ????????????\n ????????????: ' + student.name + ' ?? ????????????: \nId: '+ req.body.group.Id + '\n????????????: '+ req.body.group.name+'\n??????????????????????????: '+req.body.group.teacher+'\n??????????: ' + req.body.group.time + '\n??????: '+ req.body.group.days+ '\n\n';
			queueBot.request((retry) => bot.telegram.sendMessage(process.env.OPERATOR_GROUP_CHATID,text,botUtils.buildUrlButtonOne('???????????? ???? ????????????',url))
			.catch(error => {
				console.log(error);
				if (error.response.status === 429) { // We've got 429 - too many requests
						return retry(error.response.data.parameters.retry_after) // usually 300 seconds
				}
				throw error; // throw error further
			}),process.env.OPERATOR_GROUP_CHATID,'telegramGroup');
		}
		
		if(student.status && student.attendence){
			var text = '';
			text = '???????? ??????????: ' + req.body.group.date+'\n\n';
			text += '?????????? ?? ???????????????? ?????????????? ?? ????????????\n ????????????: ' + student.name + ' ?? ????????????: \nId: '+ req.body.group.Id + '\n????????????: '+ req.body.group.name+'\n??????????????????????????: '+req.body.group.teacher+'\n??????????: ' + req.body.group.time + '\n??????: '+ req.body.group.days+ '\n\n';
			var com = student.comment?student.comment:'';
			text += '???????????????????? ???????????????? :\n?????? : ' + student.name + '\n??/??: ' + student.homework + '\n????????: ' + student.test+'\n????????: ' + student.lesson+'\n??????????????????????: ' + com+'\n\n\n';
			queueBot.request((retry) => bot.telegram.sendMessage(process.env.OPERATOR_GROUP_CHATID,text,botUtils.buildUrlButtonOne('???????????? ???? ????????????',url))
			.catch(error => {
				console.log(error);
				if (error.response.status === 429) { // We've got 429 - too many requests
					return retry(error.response.data.parameters.retry_after) // usually 300 seconds
				}
				throw error; // throw error further
			}),process.env.OPERATOR_GROUP_CHATID,'telegramGroup');
		}
	});
});

//add student to group
router.post('/addtogroup', (req, res) => {
	var params = new Object();
	params.edUnitId = req.body.group.Id;
    params.StudentClientId = req.body.clientId;
    params.begin = req.body.group.date;
    params.weekdays = req.body.group.weekdays;
	params.status = 'Normal';
    api.post(key.domain,'AddEdUnitStudent',params,key.apikey)
    .then((response) => {
		res.json(response);
    })
    .catch(err =>{
		console.log(err);
        res.json({
			status: 410, 
			message:  'Error'
		});
    });
});


//add students from hh
router.post('/addstudentexample', (req, res) => {
	var params = "take=7000&statuses="+encodeURIComponent('?????????????????????????? ????????????,????????????????????,??????????????????,??????????????????????');
	api.get(key.domain,'GetStudents',params,key.apikey)
	.then((data) => {
        data.data.map(async function(record){
			try{
				var student = await Students.findOne({
					attributes: ['ClientId'],
					where:{
						StudentId: record.Id
					}
				});
				var klass = '??????';
				if(record.ExtraFields){
					record.ExtraFields.find(function(record){
						if(record.Name == '??????????')
							klass = record.Value;
					});
				}
				if(student === null){
					var newStudent = await Students.create({
						Class: klass,
						StudentId: record.Id,
						ClientId: record.ClientId,
						FirstName: record.FirstName,
						LastName: record.LastName,
						MiddleName: record.MiddleName?record.MiddleName:''
					},{
						fields: ['Class','StudentId','ClientId','FirstName','LastName','MiddleName']
					});
				}
			}catch(error){
				console.log(error);
			}
        });
        res.send("ok");
    });
});

//add offices from hh
router.post('/addofficeexample', (req, res) => {
	api.get(key.domain,'GetOffices','take=7000',key.apikey)
	.then((data) => {
        data.data.map(async function(record){
			try{
				var school = await Schools.findOne({
					attributes: ['SchoolId'],
					where:{
						SchoolId: record.Id
					}
				});
				if(school === null){
					var newSchool = await Schools.create({
						Name: record.Name,
						Address: record.Address,
						SchoolId: record.Id
					},{
						fields: ['Name','Address','SchoolId']
					});
				}
			}catch(error){
				console.log(error);
			}
        });
        res.send("ok");
    });
});

//add rooms to attendance online
router.post('/addroomexample', (req, res) => {
	var workbook = xlsx.readFile(path.join(__dirname,'../???????????? ????????????????.xlsx'),{cellDates: true});
	var sheetName = workbook.SheetNames[0];
	var worksheet = workbook.Sheets[sheetName];
	var data = xlsx.utils.sheet_to_json(worksheet);
	data.map(async function(record){
		try{
			record['????????????????'] = String(record['????????????????']);
			var room = await Rooms.findOne({
				attributes: ['Id','SchoolId','Room'],
				where:{
					SchoolId: record['Id'],
					Room: record['????????????????']
				}
			});
			if(room === null){
				await Rooms.create({
					SchoolId: record['????????????'],
					Room: record['????????????????']
				},{
					fields: ['SchoolId','Room'],
				});
			} 
		}catch(error){
			console.log(error);
		}
	});
	res.send('ok');
});

//add topics 
router.post('/addtopicsexample',(req,res) => {
	try{
		var workbook = xlsx.readFile(path.join(__dirname,'../primer.xlsx'),{cellDates: true});
		var n = workbook.SheetNames.length;
		for(var i = 0; i < n; i ++){
			var sheetName = workbook.SheetNames[i];
			var worksheet = workbook.Sheets[sheetName];
			var data = xlsx.utils.sheet_to_json(worksheet);
			data.map(async function(record){
				try{
					var subjectName = record['??????????????'].trim();
	
					var subject = await Subjects.findOne({
						where:{
							Name: subjectName
						}
					});
	
					var subjectLevel = record['????????????']?record['????????????'].trim():'';
	
					var level = await Levels.findOne({
						where:{
							Name: subjectLevel
						}
					});
	
					if(subject){
						var Class = record['??????????']? record['??????????'].toString(): null;
						var Name = record['????????'];
						var SubjectId = subject.Id;
						var Branch = record['??????????????????'].trim();
						var LevelId = level ? level.Id : null;
						var Priority = record['??????????'];
						var topic = await Topics.findOne({
							attributes: ['Id','Class','Name','SubjectId','Branch','LevelId'],
							where:{
								Class,
								Name,
								SubjectId,
								Branch,
								LevelId
							}
						});
						
						if(topic === null){
							await Topics.create({
								Class,
								Name,
								SubjectId,
								Branch,
								LevelId,
								Priority,
							},{
								fields: ['Class','Name','SubjectId','Branch','LevelId','Priority'],
							});
						} else {
							topic.update({
								Priority: Priority,
								Branch: Branch
							});
						}
					}
					
				}catch(error){
					console.log(error);
				}
			});
		}
		

		res.send('ok');
	}catch(err){
		console.log(err);
	}
});

router.post('/addteacherexample', (req, res) => {
   api.get(key.domain,'GetTeachers','take=7000',key.apikey)
   .then((data) => {
        data.data.map(async function(record){
				try{
					if(record.Status == '????????????????' || record.Status == '????????????????????/????????????????'){
						try{
							var teacher = await Teachers.findOne({
								attributes: ['TeacherId'],
								where:{
									TeacherId: record.Id
								}
							});
							if(teacher === null) {
								if(record.EMail){
									var newContact = await Contacts.create({
										Mobile: record.Mobile,
										Email: record.EMail
									},{
										fields:['Mobile','Email']
									});
									if(newContact){
										try{
												var email = record.EMail.toLowerCase();
												var pass =  await bcrypt.hash('123456',10);
												var auth = generateKey();
												var newTeacher = await Teachers.create({
													TeacherId: record.Id,
													FirstName: record.FirstName,
													LastName: record.LastName,
													ContactId: newContact.Id,
													Email: email,
													Password: pass,
													AUTH: auth,
													RoleId: 2
												},{
													fields: ['TeacherId','FirstName','LastName','ContactId','Email','Password','AUTH','RoleId']
												});
											
										}catch(error){
											console.log(error);
										}
									}
								}
							}
						}catch(err){
							console.log(err);
						}
					}
				} catch(err){
					console.log(err);
				}
        });
        res.send("ok");
    });
});

router.post('/registeramount',async (req,res) => {
	try{
		var date = new Date( req.body.lessonDate);
		var TeacherId = req.body.teacherId;
		var registers = await Registers.findOne({
			attributes:['Id'],
			where:{
				[Op.and]:[
					{GroupId: req.body.groupId},
					{LessonDate:date}				
				]
			}
		});
		if(registers === null){
			var result = false;
			splittedTimeZamena = req.body.time.split('-');
			timeStartZamena = new Date("01/01/1970" + " " + splittedTimeZamena[0]);		
			timeEndZamena = new Date("01/01/1970" + " " + splittedTimeZamena[1]);		
				
				
			var CheckRegistersAll = await Registers.findAll({
				attributes: ['TeacherId','Time','LessonDate'],
				where: {
					TeacherId: TeacherId,
					LessonDate: new Date(date)
				}
			});
			
			var count= Object.keys(CheckRegistersAll).length;
			for (let i = 0; i < count; i++) {
				TimeOfInst = CheckRegistersAll[i]["Time"];
				splittedTime = TimeOfInst.split('-');
				timeStart = new Date("01/01/1970" + " " + splittedTime[0]);		
				timeEnd = new Date("01/01/1970" + " " + splittedTime[1]);
				if ((timeStart < timeStartZamena && timeStart < timeEndZamena) && (timeEnd <= timeStartZamena && timeEnd < timeEndZamena)){
					continue
				} else if(((timeStart > timeStartZamena && timeStart >= timeEndZamena) && (timeEnd > timeStartZamena && timeEnd > timeEndZamena))){
					continue
				}else{
					result = true;
					
					break;
				}		
			}
			if(result){
				res.send({
					status: 440,
					message: '???? ?????? ?????????????????? ???????????? ????????????'
				});
			}else 
				res.send({
					status: 200,
					message: 'OK'
				});
		}else
			res.send({
				status: 410,
				message: '?????? ????????????????'
			});
	}catch(error){
		console.log(error);
		res.send({
			status: 500,
			message: 'Error'
		});
	}
});

router.post('/sendmail',verifyToken, async(req,res) => {
	try{
		var teacher = await Teachers.findAll({
			attributes: ['Email'],
			where:{
				TeacherId: req.body.Id
			}
		});
		if(teacher){
			const random = uniqueRandom(1000, 9999);
			var code = random();
			var mailOptions = {
				from: 'aiplus.almaty@gmail.com',
				to: teacher[0].Email,
				cc: process.env.CC_MAIL,
				subject : '???????????? ??????????????????????????',
				text: '???????????? ???? ???????????????? : ' + code
			}
			sendMail(mailOptions);
			
			res.json({status: 200, data: code});
		} else {
			res.json({status: 500, message: 'Error'});
		}
	}catch(error){
		res.json({
			status: 500,
			message: 'Error'
		});
	}
});

router.post('/editpersonal',verifyToken,async (req,res) => {
	var params = req.body;
	try{
		var teacher = await Teachers.findOne({
			attributes:['Id','FirstName','LastName','MiddleName','Password'],
			where:{
				TeacherId: params.teacherId		
			}
		});
	
		if((params.oldPass == null && params.newPass == null) || (params.oldPass != null &&  params.newPass != null && await verifyPassword(params.oldPass,teacher.Password))){
			var fullname = params.fio?params.fio.split(' '):[];
			var pass =  params.newPass ? await bcrypt.hash(params.newPass,10): null;

			fullname = fullname.map(function(name){
				
				return support.Capitalize(name);
			});
			
			if(teacher != null){
				await teacher.update({
					FirstName: fullname[1] ? fullname[1] : teacher.FirstName,
					LastName: fullname[0] ? fullname[0] : teacher.LastName,
					MiddleName: fullname[2] ? fullname[2] : teacher.MiddleName,
					Password: pass ? pass : teacher.Password
				});

				res.json({
					status: 200,
					data: fullname
				});
			} else {
				res.send({
					status: 500,
					message: '????????????'
				});
			}
		} else {
			res.json({
				status: 402,
				message: '???? ???????????????? ????????????'
			});
		}
	}catch(err){
		console.log(err);
		res.send({
			status: 500,
			message: '????????????'
		});
	}
	
});

router.get('/searchteacher',verifyToken, async (req, res) => {
	try{
		var val = '%'+req.query.value+'%'
		var query = `SELECT concat("LastName",' ',"FirstName") as "FullName", "TeacherId"
		FROM "Teachers" WHERE "FirstName" like :val OR "LastName" like :val LIMIT 10;`;
		var teachers = await sequelize.query(query,{
			replacements:{val: val},
			type: QueryTypes.SELECT
		});
		res.send({status: 200,data: teachers});
	}catch(error){
		console.log(error);
        res.send({status: 500,data: []});
	}
});

router.get('/searchstudent',verifyToken, async (req, res) => {
	try{
		if(req.query.value){
			var value = req.query.value.trim().toLowerCase();
			var arr = value.toString().split(' ');
			var arr1 = value.toString().split(' ');
			var firstname = arr[1] ? '%'+arr[1]+'%':'%%';
			var lastname  = arr[0] ? '%'+arr[0]+'%':'%%';
			arr1.splice(0,2);
			var s = arr1.join(' ');
			
			var middlename = s ? '%'+s+'%':'%%';
			var query = [];
			
			if(arr.length == 0){
				query = `SELECT "ClientId",TRIM("LastName" || ' ' || "FirstName" || ' ' || "MiddleName") as "FullName"
				FROM "Students" LIMIT 10;`;
				
				students = await sequelize.query(query,{
					type: QueryTypes.SELECT
				});

				res.send({status: 200, data: students});
			} else if(arr.length  == 1){
				query = `SELECT "ClientId",TRIM("LastName" || ' ' || "FirstName" || ' ' || "MiddleName") as "FullName"
				FROM "Students" WHERE (LOWER("LastName") like :lastname OR LOWER("FirstName") like :lastname) LIMIT 10;`;
				students = await sequelize.query(query,{
					replacements:{lastname: lastname},
					type: QueryTypes.SELECT
				});

				res.send({status: 200, data: students});
			} else if(arr.length == 2){
				query = `SELECT "ClientId",TRIM("LastName" || ' ' || "FirstName" || ' ' || "MiddleName") as "FullName"
				FROM "Students" WHERE ((LOWER("LastName") like :lastname AND LOWER("FirstName") like :firstname) OR (LOWER("LastName") like :firstname AND LOWER("FirstName") like :lastname)) LIMIT 10;`;
				students = await sequelize.query(query,{
					replacements:{firstname: firstname,lastname:lastname},
					type: QueryTypes.SELECT
				});

				res.send({status: 200, data: students});
			}else {
				query = `SELECT "ClientId",TRIM("LastName" || ' ' || "FirstName" || ' ' || "MiddleName") as "FullName"
				FROM "Students" WHERE  ("LastName" like :lastname AND "FirstName" like :firstname AND "MiddleName" like :middlename) LIMIT 10;`;
				students = await sequelize.query(query,{
					replacements:{firstname: firstname,lastname:lastname,middlename:middlename},
					type: QueryTypes.SELECT
				});

				res.send({status: 200, data: students});
			}
		}
		
	}catch(error){
		console.log(error);
        res.send({status: 500,data: []});
	}
});

router.get('/subteacher',verifyToken, async (req, res) => {
	try{
		var fullname = req.query.FullName.split(' ');
		var LastName = fullname[0];
		var FirstName = fullname[1];

		var teacher = await Teachers.findOne({
			attributes: ['TeacherId',[sequelize.fn("concat",sequelize.col("LastName")," ",sequelize.col("FirstName")),"FullName"]],
			where:{
				LastName,
				FirstName
			}
		});
		if(teacher === null)
			res.send({
				status: 404,
				message: '???????????? ?????????????????????????? ??????'
			});
		else
			res.json({
				status: 200,
				data: teacher
			});
	}catch(error){
		console.log(error);
        res.send({
			status: 500,
			message: 'Error'
		});
	}
});

router.get('/getregister',verifyToken,async (req, res) => {
	try{
		var dateFrom = new Date(req.query.dateFrom);
		var dateTo = new Date(req.query.dateTo);

		const query = `SELECT reg."Id", reg."GroupName", reg."Time", reg."LessonDate", reg."WeekDays",
		reg."SubmitDay", reg."SubmitTime",reg."Online",
		SUM(CASE WHEN subregAll."Pass" = :pass THEN 1 ELSE 0 END) as "Passed",COUNT(subregAll."Id") as "All", sch."Name", reg."Fine",reg."Paperdone"
		FROM public."Registers" as reg
		LEFT JOIN public."SubRegisters" as subregAll ON reg."Id" = subregAll."RegisterId"
		LEFT JOIN public."Schools" as sch ON reg."SchoolId" = sch."SchoolId"
		WHERE reg."TeacherId" = :teacherId AND reg."LessonDate" BETWEEN :dateFrom AND :dateTo 
		GROUP BY reg."Id",sch."Name"
		UNION
		SELECT bumreg."Id", bumreg."GroupName", bumreg."Time", bumreg."LessonDate", bumreg."WeekDays",
		bumreg."SubmitDay", bumreg."SubmitTime",bumreg."Online",
		SUM(CASE WHEN subregAll."Pass" = :pass THEN 1 ELSE 0 END) as "Passed",COUNT(subregAll."Id") as "All", sch."Name", bumreg."Fine",bumreg."Paperdone"
		FROM public."BumRegisters" as bumreg
		LEFT JOIN public."BumSubRegisters" as subregAll ON bumreg."Id" = subregAll."RegisterId"
		LEFT JOIN public."Schools" as sch ON bumreg."SchoolId" = sch."SchoolId"
		WHERE bumreg."TeacherId" = :teacherId AND bumreg."LessonDate" BETWEEN :dateFrom AND :dateTo 
		GROUP BY bumreg."Id",sch."Name";`;

		var registers = await sequelize.query(query,{
			replacements:{dateFrom: dateFrom,dateTo: dateTo, pass:true, teacherId:req.query.teacherId},
			type: QueryTypes.SELECT
		});

		
		res.send({status: 200, data: registers});
	}catch(error){
		console.log(error);
        res.send({status: 500,data: []});
	}
});

router.post('/getregisterReport',verifyToken,async (req, res) => {
	try{
		var dateFrom = new Date(req.body.dateFrom);
		var dateTo = new Date(req.body.dateTo);

		const query = `SELECT reg."Id", reg."GroupName", reg."Time", reg."LessonDate", reg."WeekDays",
		reg."SubmitDay", reg."SubmitTime",reg."Online",
		SUM(CASE WHEN subregAll."Pass" = :pass THEN 1 ELSE 0 END) as "Passed",COUNT(subregAll."Id") as "All", sch."Name", reg."Fine",reg."Paperdone",
		'Registers' as "Source"
		FROM public."Registers" as reg
		LEFT JOIN public."SubRegisters" as subregAll ON reg."Id" = subregAll."RegisterId"
		LEFT JOIN public."Schools" as sch ON reg."SchoolId" = sch."SchoolId"
		WHERE reg."TeacherId" = :teacherId AND reg."LessonDate" BETWEEN :dateFrom AND :dateTo 
		GROUP BY reg."Id",sch."Name"
		UNION
		SELECT bumreg."Id", bumreg."GroupName", bumreg."Time", bumreg."LessonDate", bumreg."WeekDays",
		bumreg."SubmitDay", bumreg."SubmitTime",bumreg."Online",
		SUM(CASE WHEN bumsubregAll."Pass" = :pass THEN 1 ELSE 0 END) as "Passed",COUNT(bumsubregAll."Id") as "All", sch."Name", bumreg."Fine",bumreg."Paperdone",
		'BumRegisters' as "Source"
		FROM public."BumRegisters" as bumreg
		LEFT JOIN public."BumSubRegisters" as bumsubregAll ON bumreg."Id" = bumsubregAll."RegisterId"
		LEFT JOIN public."Schools" as sch ON bumreg."SchoolId" = sch."SchoolId"
		WHERE bumreg."TeacherId" = :teacherId AND bumreg."LessonDate" BETWEEN :dateFrom AND :dateTo 
		GROUP BY bumreg."Id",sch."Name";`;

		var registers = await sequelize.query(query,{
			replacements:{dateFrom: dateFrom,dateTo: dateTo, pass:true, teacherId:req.body.teacherId},
			type: QueryTypes.SELECT
		});

		dates = support.getDatesInRange(dateFrom,dateTo);

		for (i in dates) {
			TempTime = dates[i].toISOString().split("T");
			dates[i] = TempTime[0];
		}

		var reports = new Array();
		for (date of dates){
			var obj = new Object();
			var countOnline = 0;
			var countPaper = 0;
			flag = false;
			registers.map(function(register){
				if (date == register.LessonDate){
					flag = true;
					tempRegDate = register.LessonDate;

					if(register.Source == 'Registers' || register.Source == 'DopRegisters'){
						countOnline++;
					}else if(register.Source == 'BumRegisters'){
						countPaper++;
					}
				}
			});
			if(flag){
				obj.LessonDate = tempRegDate;
				obj.OnlineLessons = countOnline;
				obj.PaperLessons = countPaper;
				reports.push(obj);
			}
		}	

		reports.sort(support.compareReportDate);

		res.send({status: 200, dataRep: reports, dataReg: registers});

	}catch(error){
		console.log(error);
        res.send({status: 500,data: []});
	}
});

router.post('/getregisterReport',verifyToken,async (req, res) => {
	try{
		var dateFrom = new Date(req.body.dateFrom);
		var dateTo = new Date(req.body.dateTo);

		const query = `SELECT reg."Id", reg."GroupName", reg."Time", reg."LessonDate", reg."WeekDays",
		reg."SubmitDay", reg."SubmitTime",reg."Online",
		SUM(CASE WHEN subregAll."Pass" = :pass THEN 1 ELSE 0 END) as "Passed",COUNT(subregAll."Id") as "All", sch."Name", reg."Fine",reg."Paperdone",
		'Registers' as "Source"
		FROM public."Registers" as reg
		LEFT JOIN public."SubRegisters" as subregAll ON reg."Id" = subregAll."RegisterId"
		LEFT JOIN public."Schools" as sch ON reg."SchoolId" = sch."SchoolId"
		WHERE reg."TeacherId" = :teacherId AND reg."LessonDate" BETWEEN :dateFrom AND :dateTo 
		GROUP BY reg."Id",sch."Name"
		UNION
		SELECT bumreg."Id", bumreg."GroupName", bumreg."Time", bumreg."LessonDate", bumreg."WeekDays",
		bumreg."SubmitDay", bumreg."SubmitTime",bumreg."Online",
		SUM(CASE WHEN bumsubregAll."Pass" = :pass THEN 1 ELSE 0 END) as "Passed",COUNT(bumsubregAll."Id") as "All", sch."Name", bumreg."Fine",bumreg."Paperdone",
		'BumRegisters' as "Source"
		FROM public."BumRegisters" as bumreg
		LEFT JOIN public."BumSubRegisters" as bumsubregAll ON bumreg."Id" = bumsubregAll."RegisterId"
		LEFT JOIN public."Schools" as sch ON bumreg."SchoolId" = sch."SchoolId"
		WHERE bumreg."TeacherId" = :teacherId AND bumreg."LessonDate" BETWEEN :dateFrom AND :dateTo 
		GROUP BY bumreg."Id",sch."Name";`;

		var registers = await sequelize.query(query,{
			replacements:{dateFrom: dateFrom,dateTo: dateTo, pass:true, teacherId:req.body.teacherId},
			type: QueryTypes.SELECT
		});

		dates = support.getDatesInRange(dateFrom,dateTo);

		for (i in dates) {
			TempTime = dates[i].toISOString().split("T");
			dates[i] = TempTime[0];
		}

		var reports = new Array();
		for (date of dates){
			var obj = new Object();
			var countOnline = 0;
			var countPaper = 0;
			flag = false;
			registers.map(function(register){
				if (date == register.LessonDate){
					flag = true;
					tempRegDate = register.LessonDate;

					if(register.Source == 'Registers' || register.Source == 'DopRegisters'){
						countOnline++;
					}else if(register.Source == 'BumRegisters'){
						countPaper++;
					}
				}
			});
			if(flag){
				obj.LessonDate = tempRegDate;
				obj.OnlineLessons = countOnline;
				obj.PaperLessons = countPaper;
				reports.push(obj);
			}
		}	

		reports.sort(support.compareReportDate);

		res.send({status: 200, dataRep: reports, dataReg: registers});

	}catch(error){
		console.log(error);
        res.send({status: 500,data: []});
	}
});


router.get('/getregisterdetails',verifyToken,async (req, res) => {
	try{
		var dateFrom = new Date('2020-09-02');
		var dateTo = new Date('2020-09-09');
		var registerId = req.query.registerId;
		var query = `SELECT "ClientId","FullName","Pass","Aibucks",
		concat(subregisters."Homework",' / ',query."avghomework") as Homework,
		concat(subregisters."Test",' / ',query."avgtest") as Test,
		concat(subregisters."Lesson",' / ',query."avglesson") as Lesson,
		"Comment",subregisters."Aibucks"
		FROM "SubRegisters" as subregisters LEFT JOIN 
		(SELECT "ClientId" as clint,round(AVG("Homework"),2) as AvgHomework,round(AVG("Test"),2) as AvgTest,round(AVG("Lesson"),2) as AvgLesson
		FROM "SubRegisters",
		(SELECT "Id" FROM "Registers" WHERE "LessonDate" BETWEEN :dateFrom AND :dateTo) as subquery
		WHERE "RegisterId" = subquery."Id" AND "Pass"=true GROUP BY "ClientId") as query
		ON subregisters."ClientId" = query."clint" WHERE subregisters."RegisterId" = :registerId`;
		var subregisters = await sequelize.query(query,{
			replacements:{dateFrom: dateFrom,dateTo: dateTo, registerId: registerId},
			type: QueryTypes.SELECT
		});

		res.send({status: 200, data: subregisters});
	}catch(error){
		console.log(error);
        res.send({status: 500,data: []});
	}
});

router.get('/getbumregisterdetails',verifyToken,async (req, res) => {
	try{
		var dateFrom = new Date('2020-09-02');
		var dateTo = new Date('2020-09-09');
		var registerId = req.query.registerId;
		var query = `SELECT "ClientId","FullName","Pass","Aibucks",
		concat(subregisters."Homework",' / ',query."avghomework") as Homework,
		concat(subregisters."Test",' / ',query."avgtest") as Test,
		concat(subregisters."Lesson",' / ',query."avglesson") as Lesson,
		"Comment",subregisters."Aibucks"
		FROM "BumSubRegisters" as subregisters LEFT JOIN 
		(SELECT "ClientId" as clint,round(AVG("Homework"),2) as AvgHomework,round(AVG("Test"),2) as AvgTest,round(AVG("Lesson"),2) as AvgLesson
		FROM "SubRegisters",
		(SELECT "Id" FROM "BumRegisters" WHERE "LessonDate" BETWEEN :dateFrom AND :dateTo) as subquery
		WHERE "RegisterId" = subquery."Id" AND "Pass"=true GROUP BY "ClientId") as query
		ON subregisters."ClientId" = query."clint" WHERE subregisters."RegisterId" = :registerId`;
		var subregisters = await sequelize.query(query,{
			replacements:{dateFrom: dateFrom,dateTo: dateTo, registerId: registerId},
			type: QueryTypes.SELECT
		});

		res.send({status: 200, data: subregisters});
	}catch(error){
		console.log(error);
        res.send({status: 500,data: []});
	}
});

router.get('/getdopregisterdetails',verifyToken,async (req, res) => {
	try{
		var dateFrom = new Date('2020-09-02');
		var dateTo = new Date('2020-09-09');
		var registerId = req.query.registerId;
		var query = `SELECT "ClientId","FullName","Pass",
		concat(subregisters."Task",' / ',query."avghomework") as Task,
		concat(subregisters."TaskMax",' / ',query."avgtest") as TaskMax,
		concat(subregisters."Complition",' / ',query."avglesson") as Complition,
		"Comment"
		FROM "DopSubRegisters" as subregisters LEFT JOIN 
		(SELECT "ClientId" as clint,round(AVG("Task"),2) as AvgHomework,round(AVG("TaskMax"),2) as AvgTest,round(AVG("Complition"),2) as AvgLesson
		FROM "DopSubRegisters",
		(SELECT "Id" FROM "DopRegisters" WHERE "LessonDate" BETWEEN :dateFrom AND :dateTo) as subquery
		WHERE "RegisterId" = subquery."Id" AND "Pass"=true GROUP BY "ClientId") as query
		ON subregisters."ClientId" = query."clint" WHERE subregisters."RegisterId" = :registerId`;
		var subregisters = await sequelize.query(query,{
			replacements:{dateFrom: dateFrom,dateTo: dateTo, registerId: registerId},
			type: QueryTypes.SELECT
		});

		res.send({status: 200, data: subregisters});
	}catch(error){
		console.log(error);
        res.send({status: 500,data: []});
	}
});

router.get('/getuniqueregister',verifyToken,async (req, res) => {
	try{
		const query = `SELECT DISTINCT "GroupId", "GroupName", "Time", "WeekDays", concat("FirstName",' ',"LastName") as Teacher
		FROM "Registers" as registers
		LEFT JOIN "Teachers" as teachers
		ON registers."TeacherId" = teachers."TeacherId";`
		var registers = await sequelize.query(query,{type: QueryTypes.SELECT});
		
		res.send({status: 200, data: registers});
	}catch(error){
		console.log(error);
        res.send({status: 500,data: []});
	}
});

router.get('/getsubregistersavg',verifyToken,async (req, res) => {
	try{
		const query = `SELECT "ClientId","FullName","Pass",query."avghomework" as "Homework",
		query."avgtest" as "Test",
		query."avglesson" as "Lesson"
		FROM "SubRegisters" as subregisters LEFT JOIN 
		(SELECT "ClientId" as clint,round(AVG("Homework"),2) as AvgHomework,round(AVG("Test"),2)
		as AvgTest,round(AVG("Lesson"),2) as AvgLesson
		FROM "SubRegisters",
		(SELECT "Id" FROM "Registers" WHERE "LessonDate" BETWEEN '2020-09-02' AND '2020-09-09') as subquery
		WHERE "RegisterId" = subquery."Id" AND "Pass"=true GROUP BY "ClientId") as query
		ON subregisters."ClientId" = query."clint" WHERE subregisters."RegisterId" = (SELECT "Id"
		FROM public."Registers" 
		WHERE "LessonDate" = (SELECT MAX("LessonDate") FROM "Registers") AND "GroupId" = :groupId);`
		var subregisters = await sequelize.query(query,{
			replacements:{groupId: req.query.groupId},
			type: QueryTypes.SELECT
		});
		
		res.send({status: 200, data: subregisters});
	}catch(error){
		console.log(error);
        res.send({status: 500,data: []});
	}
});

router.get('/getdayregisters',async(req,res) => {
	try{
		var dateFrom = new Date(req.query.dateFrom);
		var dateTo = new Date(req.query.dateTo);
		const query = `SELECT reg."Id", reg."GroupName", reg."Time", reg."LessonDate", reg."WeekDays",
		reg."SubmitDay", reg."SubmitTime",reg."LevelTest",rom."Room",reg."Aibucks",reg."Online",reg."Paperdone",top."Name" as "Topic",
		CASE 
			WHEN reg."GroupName" like '%RO%' THEN 'RO'
			WHEN reg."GroupName" like '%KO%' THEN 'KO'
		END AS "Branch", concat(teach."LastName",' ',teach."FirstName") as "FullName", concat(subteach."LastName",' ',subteach."FirstName") as "SubFullName",
		SUM(CASE WHEN subregAll."Pass" = :pass THEN 1 ELSE 0 END) as "Passed",COUNT(subregAll."Id") as "All", sch."Name", reg."Fine",teach."Rate60",teach."Rate90",
		'Registers' as "Source"
		FROM public."Registers" as reg
		LEFT JOIN public."Teachers" as teach ON reg."TeacherId" = teach."TeacherId"
		LEFT JOIN public."Teachers" as subteach ON reg."SubTeacherId" = subteach."TeacherId"
		LEFT JOIN public."SubRegisters" as subregAll ON reg."Id" = subregAll."RegisterId"
		LEFT JOIN public."Schools" as sch ON reg."SchoolId" = sch."SchoolId"
		LEFT JOIN public."Rooms" as rom ON rom."Id" = reg."RoomId"
		LEFT JOIN public."Topics" as top ON top."Id" = reg."TopicId"
		WHERE reg."LessonDate" BETWEEN :dateFrom AND :dateTo
		GROUP BY reg."Id",teach."LastName",teach."FirstName",sch."Name",rom."Room",subteach."LastName",subteach."FirstName",top."Name",teach."Rate60",teach."Rate90"
		UNION 
		SELECT bumreg."Id", bumreg."GroupName", bumreg."Time", bumreg."LessonDate", bumreg."WeekDays",
		bumreg."SubmitDay", bumreg."SubmitTime",bumreg."LevelTest",rom."Room",bumreg."Aibucks",bumreg."Online",bumreg."Paperdone",top."Name" as "Topic",
		CASE 
			WHEN bumreg."GroupName" like '%RO%' THEN 'RO'
			WHEN bumreg."GroupName" like '%KO%' THEN 'KO'
		END AS "Branch", concat(teach."LastName",' ',teach."FirstName") as "FullName", concat(subteach."LastName",' ',subteach."FirstName") as "SubFullName",
		SUM(CASE WHEN bumsubregAll."Pass" = :pass THEN 1 ELSE 0 END) as "Passed",COUNT(bumsubregAll."Id") as "All", sch."Name", bumreg."Fine",teach."Rate60",teach."Rate90",
		'BumRegisters' as "Source"
		FROM public."BumRegisters" as bumreg
		LEFT JOIN public."Teachers" as teach ON bumreg."TeacherId" = teach."TeacherId"
		LEFT JOIN public."Teachers" as subteach ON bumreg."SubTeacherId" = subteach."TeacherId"
		LEFT JOIN public."BumSubRegisters" as bumsubregAll ON bumreg."Id" = bumsubregAll."RegisterId"
		LEFT JOIN public."Schools" as sch ON bumreg."SchoolId" = sch."SchoolId"
		LEFT JOIN public."Rooms" as rom ON rom."Id" = bumreg."RoomId"
		LEFT JOIN public."Topics" as top ON top."Id" = bumreg."TopicId"
		WHERE bumreg."LessonDate" BETWEEN :dateFrom AND :dateTo
		GROUP BY bumreg."Id",teach."LastName",teach."FirstName",sch."Name",rom."Room",subteach."LastName",subteach."FirstName",top."Name",teach."Rate60",teach."Rate90";`;
		var registers = await sequelize.query(query,{
			replacements:{dateFrom: dateFrom,dateTo: dateTo, pass:true},
			type: QueryTypes.SELECT
		});

		registers.map(function(register){
			var subject = support.subjectName(register.GroupName);
			var klass = support.getClass(register.GroupName);
			var arr = register.Time.split('-');
			register.Subject = subject;
			register.Klass = klass;
			register.begin = support.getTimeInMinutes(arr[0]);
			register.end = support.getTimeInMinutes(arr[1]);
		});
		registers.sort(support.compareTimes);
		res.send({status: 200, data: registers});
	}catch(error){
		console.log(error);
        res.send({status: 500,data: []});
	}
});

router.get('/getofficerooms',async (req,res) => {
	try{
		var officeId = req.query.officeId;
		var rooms = await Rooms.findAll({
			attributes: ['Id','Room'],
			where:{
				SchoolId: officeId
			}
		});
		if(rooms.length > 0){
			res.send({status: 200, data: rooms});
		} else {
			res.send({status: 200, data: []});
		}
	}catch(err){
		console.log(err);
		res.send({status: 200, data: []});
	}
});

router.get('/lastlessonroom',async (req,res) => {
	try{
		var groupId = req.query.groupId;

		const query = `SELECT rom."Id",rom."Room",reg."LevelTest" FROM public."Registers" as reg
		LEFT JOIN public."Rooms" as rom ON reg."RoomId" = rom."Id"
		WHERE reg."LessonDate" = 
		(
		SELECT MAX("LessonDate")
		FROM public."Registers" WHERE "GroupId" = :groupId
		) LIMIT 1;`;
		var room = await sequelize.query(query,{
			replacements:{groupId: groupId},
			type: QueryTypes.SELECT
		});
		if(room.length > 0){
			var obj = {};
			var lastroom = {};
			lastroom.Id = room[0].Id;
			lastroom.Room = room[0].Room;
			obj.room = lastroom;
			obj.level = room[0].LevelTest;
			res.send({status: 200, data: obj});	
		}else{
			res.send({status: 404, data: null});
		}
	}catch(error){
        res.send({status: 500,data: null});
	}
});

router.get('/gettestsubjects',async (req,res) => {
	try{
		var testId = req.query.testId;

		const query = `SELECT tsb."Id",sb."Name", tsb."MaxScore"
		FROM public."TestSubjects" tsb
		LEFT JOIN public."Subjects" sb ON sb."Id" = tsb."SubjectId"
		WHERE "TestId" = :testId`;
		var testsubjects = await sequelize.query(query,{
			replacements:{testId: testId},
			type: QueryTypes.SELECT
		});
	
		if(testsubjects.length > 0){
			res.send({status: 200, data: testsubjects});	
		}else{
			res.send({status: 404, data: null});
		}
	}catch(error){
		console.log(error);
        res.send({status: 500,data: null});
	}
});

router.get('/searchstudenttest',verifyToken, async (req, res) => {
	try{
		
		var arr = req.query.value.split(' ');
		var firstname = arr[1] ? '%'+arr[1]+'%':'%%';
		var lastname  = arr[0] ? '%'+arr[0]+'%':'%%';
		var middlename = arr[2] ? '%'+arr[2]+'%':'%%';
		
		var query = `SELECT "StudentId",concat("LastName",' ',"FirstName",' ',"MiddleName") as "FullName"
		FROM "Students" WHERE "LastName" like :lastname AND "FirstName" like :firstname AND "MiddleName" like :middlename`;
		var students = await sequelize.query(query,{
			replacements:{firstname: firstname,lastname:lastname,middlename:middlename},
			type: QueryTypes.SELECT
		});
		res.send({status: 200, data: students});	
	}catch(error){
		console.log(error);
        res.send({status: 500,data: []});
	}
});

router.post('/setpersonaltests',async (req,res)=>{
	try{
		var today = new Date();
		var day = today.getFullYear()+'-'+("0" + (today.getMonth()+1)).slice(-2)+'-'+("0" + today.getDate()).slice(-2);
		var students = req.body.students;
		var personalTest = req.body.personalTest;
		var teacherId = req.body.teacherId;
		var testresults = [];
		students.map(function(student){
			student.testSubjects.map(function(testsubject){
				var obj = {};
				obj.StudentId = student.value.StudentId;
				obj.TestSubjectId = testsubject.Id;
				obj.TeacherId = teacherId;
				obj.Score = testsubject.Score;
				obj.TestDate = personalTest.date;
				obj.SubmitDate = day;
				testresults.push(obj);
			});
		});
	
		var result = await TestResults.bulkCreate(testresults,{
			fields:['StudentId','TestSubjectId','TeacherId','Score','TestDate','SubmitDate']
		});

		if(result.length > 0){
			res.json({
				status: 200,
				message: 'OK'				
			});
		}else {
			res.json({
				status: 500,
				message: 'Error'
			});
		}
	}catch(err){
		console.log(error);
		res.json({
			status: 500,
			message: 'Error'
		});
	}
});

router.get('/gettopics',async (req,res) => {
	try{
		var Class = req.query.klass;
		var Branch = req.query.branch;
		var LevelId = req.query.level ? req.query.level:null;
		var SubjectName = req.query.subject;
		var query = ``;
		var topics = [];
		if(LevelId){
			query = `SELECT tp."Id", tp."Priority" || '. ' || tp."Name" as "Name", tp."Priority"
			FROM public."Topics" as tp
			LEFT JOIN public."Subjects" as sbj ON  tp."SubjectId" = sbj."Id"
			WHERE tp."Class" = :Class AND (tp."Branch" = :Branch OR tp."Branch" = '????????') AND tp."LevelId" = :LevelId AND sbj."Name" = :SubjectName ORDER BY tp."Priority";`
			topics =  await sequelize.query(query,{
				replacements:{Class: Class,Branch:Branch,LevelId:LevelId,SubjectName:SubjectName},
				type: QueryTypes.SELECT
			});
		} else {
			query = `SELECT tp."Id", tp."Priority" || '. ' || tp."Name" as "Name", tp."Priority"
			FROM public."Topics" as tp
			LEFT JOIN public."Subjects" as sbj ON  tp."SubjectId" = sbj."Id"
			WHERE tp."Class" = :Class AND (tp."Branch" = :Branch OR tp."Branch" = '????????') AND tp."LevelId" is NULL AND sbj."Name" = :SubjectName ORDER BY tp."Priority";`
			topics =  await sequelize.query(query,{
				replacements:{Class: Class,Branch:Branch,SubjectName:SubjectName},
				type: QueryTypes.SELECT
			});
		}
		res.send({status: 200, data: topics});	
	}catch(err){
		console.log(err);
	}
	

});

router.get('/getpersonaltestteacher', async (req,res) => {
	try{
		var teacherId = req.query.teacherId;
		var dateFrom = req.query.dateFrom;
		var dateTo = req.query.dateTo;
		var testId = req.query.testId;
		var query = `SELECT DISTINCT sub."ClientId"
		FROM "SubRegisters" as sub
		LEFT JOIN "Registers" as reg ON sub."RegisterId" = reg."Id"
		WHERE  reg."TeacherId" = :teacherId AND (reg."Change" = false OR reg."Change" IS NULL);`;

		var students = await sequelize.query(query,{
			replacements:{teacherId: teacherId},
			type: QueryTypes.SELECT
		});  
		
		var str_studenst = students.map(e => e.ClientId);
		query = `SELECT sb."Id", sb."Name"
		FROM public."Subjects" as sb
		LEFT JOIN public."TestSubjects" as tsb ON tsb."SubjectId" = sb."Id"
		WHERE tsb."TestId" = :testId`;
		var subjects = await sequelize.query(query,{
			replacements:{testId: testId},
			type: QueryTypes.SELECT
		});  

		var headers = [{ text: '????????????', value: 'Student', filterable: true},{text: '????????', value: 'TestDate'}];
		subjects.map((subject)=>{
			var obj = {};
			obj.text = subject.Name;
			obj.value = 'Name'+subject.Id;
			headers.push(obj);
		});
		query = `SELECT st."ClientId",st."LastName" || ' ' || st."FirstName" as "FullName", sb."Id", "Score",tsb."MinScore","TestDate"
		FROM public."TestResults" as res
		LEFT JOIN public."Students" as st ON st."ClientId" = res."ClientId"
		LEFT JOIN public."TestSubjects" as tsb ON tsb."Id" = res."TestSubjectId"
		LEFT JOIN public."Subjects" as sb ON sb."Id" = tsb."SubjectId"
		WHERE tsb."TestId" = :testId AND res."TestDate" BETWEEN :from AND :to AND res."ClientId" IN (:students);`
		var tests = await sequelize.query(query,{
			replacements:{testId: testId,from: dateFrom,to:dateTo,students: str_studenst},
			type: QueryTypes.SELECT
		}); 
		var items = [];
		str_studenst.map(function(clientId){
			var filters = tests.filter(test => test.ClientId == clientId);
			if(filters.length > 0){
				var set = new Set();
				filters.filter((value,index) => {
					set.add(value.TestDate);
				});
				
				var days = Array.from(set);
				days.map(function(day){
					var item = {};
					item['Student'] = filters[0].FullName;
					item['TestDate'] = day;
					filters.map(function(filter){
						if(filter.TestDate == day)
							item['Name'+filter.Id] = filter.Score;
					});
					items.push(item);
				});
				
			}
		});
		res.send({status: 200, data: {headers: headers,items: items}});
	}catch(err){
		console.log(err);
	}
});

router.get('/gettablecolumns', async (req,res) => {
	try{
		var table = req.query.Table;
		
		var query = `SELECT column_name,data_type FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name = :table;`;

		var columns = await sequelize.query(query,{
			replacements:{table: table},
			type: QueryTypes.SELECT
		});  
		var headers = [];
		columns.map(function(column){
			headers.push({
				text: column.column_name,
				value: column.column_name
			});
		});

		headers.push({
			text: 'Actions', 
			value: 'actions'
		});

		query = `SELECT * FROM public."${table}";`;

		var items = await sequelize.query(query,{
			type: QueryTypes.SELECT
		}); 
		res.send({status: 200, data: {headers:headers, items: items}});
	}catch(err){
		console.log(err);
	}
});

router.post('/cronatt', async (req,res) => {
	try{
		var date = '2021-04-06';
		var params = `dateFrom=${date}&dateTo=${date}&TestTypeCategoryName=Attendance list&TestTypeName=${encodeURIComponent('???????????????? ??????????????')}&take=7000`;
		var response = await api.get(key.domain,'GetEdUnitTestResults',params,key.apikey);
		res.send(response);
	}catch(err){
		console.log(err);
	}
});


router.post('/telegramtohh', async(req,res) => {
	try{
		var date = new Date(req.body.date);
		var registers = await Registers.findAll({
			fields:['Id','TeacherId','GroupId','GroupName','Time','LessonDate','WeekDays','SubmitDay','SubmitTime','IsSubmitted','IsStudentAdd','IsOperator'],
			where:{
				LessonDate: date,
				IsStudentAdd: true
			}
		});

		await registers.reduce(async function(previousPromise,register){
			await previousPromise;
			return new Promise(async function(resolve,reject){
				try{
					var klass = parseInt(support.getClass(register.GroupName));
					await sleep(100);
					var subregisters = await SubRegisters.findAll({
						fields:['Id','ClientId','FullName','Pass','Homework','Test','Lesson','Comment','Status','SubjectN'],
						where:{
							RegisterId: register.Id,
							Status: true,
							Pass: true
						}
					});
					if(subregisters.length > 0){
						await subregisters.reduce(async function(previousStudentPromise,student){
							await previousStudentPromise;							
							return new Promise(async function(resolve,reject){
								try{
									var params = new Array();
									var st = new Object()
									st.Date = register.LessonDate;
									st.EdUnitId = register.GroupId;
									st.StudentClientId = student.ClientId;
									st.Pass = false;
									st.Payable = false;
									st.overwriteAcceptedManually = true;
									params.push(st);
									await api.post(key.domain,'SetStudentPasses',params,key.apikey);


									var data = new Object();
									data.edUnitId = register.GroupId;
									data.studentClientId = student.ClientId;
									data.date = register.LessonDate;
									if(klass >= 0 && klass < 4){
										data.testTypeId = process.env.TEST_TYPE_ID_N;
										var skills = new Array();
										var skill = new Object();
										skill.skillId = process.env.SCORE_TEACHER_SKILL_ID; // ???????????? ??????????????
										skill.score = student.Homework;
										skills.push(skill);
										skill = new Object();
										skill.skillId = process.env.TEST_SKILL_ID; // ????????
										skill.score = student.Test;
										skills.push(skill);
										skill = new Object();
										skill.skillId = process.env.RANG_SKILL_ID; // ????????
										skill.score = student.Lesson;
										skills.push(skill);
										skill = new Object();
										skill.skillId = process.env.THEME_SKILL_ID; // ??????????????
										skill.score = student.SubjectN;
										skills.push(skill);			
										
										data.skills = skills;
										
									}else if(klass >=4 && klass < 6){
										data.testTypeId = process.env.TEST_TYPE_ID_T;
										var skills = new Array();
										var skill = new Object();
										skill.skillId = process.env.SCORE_TEACHER_SKILL_ID; // ???????????? ??????????????
										skill.score = student.Homework;
										skills.push(skill);
										skill = new Object();
										skill.skillId = process.env.TEST_SKILL_ID; // ????????
										skill.score = student.Test;
										skills.push(skill);
										skill = new Object();
										skill.skillId = process.env.RANG_SKILL_ID; // ????????
										skill.score = student.Lesson;
										skills.push(skill);
										if(student.SubjectN){
											skill = new Object();
											skill.skillId = process.env.TOPIC_SKILL_ID; // ??????????????
											skill.score = student.SubjectN;
											skills.push(skill);			
										}else{
											skill = new Object();
											skill.skillId = process.env.TOPIC_SKILL_ID; // ??????????????
											skill.score = 0;
											skills.push(skill);
										}

										data.skills = skills;
									}else {
										data.testTypeId = process.env.TEST_TYPE_ID;
										var skills = new Array();
										var skill = new Object();
										skill.skillId = process.env.SCORE_TEACHER_SKILL_ID; // ???????????? ??????????????
										skill.score = student.Homework;
										skills.push(skill);
										skill = new Object();
										skill.skillId = process.env.TEST_SKILL_ID; // ????????
										skill.score = student.Test;
										skills.push(skill);
										skill = new Object();
										skill.skillId = process.env.RANG_SKILL_ID; // ????????
										skill.score = student.Lesson;
										skills.push(skill);
										data.skills = skills;
									}
									data.commentHtml = student.Comment;
									var res = await api.post(key.domain,'AddEditEdUnitTestResult',data,key.apikey);
									if(res.status == 200){
										await student.update({
											Status: false
										});
										resolve(true);
									}else{
										resolve(true);
									}									
								}catch(err){
									await sleep(100);
									sendTelegramIND(register,student);
									resolve(true);
								}
							});
						},Promise.resolve(true));
						resolve(true);
					} else {
						resolve(true);
					}
				}catch(err){
					console.log(err);
					resolve(true);
				}
			});
		},Promise.resolve(true));

		res.send('ok');
	}catch(err){
		console.log(err);
	}
});

router.post('/telegramtohh2', async(req,res) => {
	try{
		var date = new Date(req.body.date);
		var registers = await BumRegisters.findAll({
			fields:['Id','TeacherId','GroupName','Time','LessonDate','WeekDays','SubmitDay','SubmitTime','IsSubmitted','IsStudentAdd','IsOperator'],
			where:{
				LessonDate: date,
				Paperdone: false
			}
		});
		await registers.reduce(async function(previousPromise,register){
			await previousPromise;
			return new Promise(async function(resolve,reject){
				try{
					var found = false
					var TimeOfInst = register.Time;
					var splittedTime = TimeOfInst.split('-');
					var group = null;
					var params = 'types=Group&dateFrom='+req.body.date+'&dateTo='+req.body.date+'&statuses=Working&teacherId='+register.TeacherId+'&timeFrom='+splittedTime[0]+'&timeTo='+splittedTime[1];
					var response = await api.get(key.domain,'GetEdUnits',params,key.apikey)
					if(response.status == 200){
						if(response.data.length == 1){
							found = true;
							group = response.data[0];
						}else{
							var paramOffice = 'Id='+register.SchoolId;
							var resOffice = await api.get(key.domain,'GetOffices',paramOffice,key.apikey)
							var st = new Object()
							st.schoolName = resOffice.data[0]['Name']
							st.teacherId = register.TeacherId;
							st.date = date.toISOString().substring(0,10);
							st.groupName = register.GroupName;
							st.time = register.Time
							sendTelegramGROUP(st)
						}
					}
					
					if(found){
						var klass = parseInt(support.getClass(register.GroupName));
						if (found == true){
							await register.update({
								Paperdone: true
							});
						}
						await sleep(100);
						var subregisters = await BumSubRegisters.findAll({
							fields:['Id','ClientId','FullName','Pass','Homework','Test','Lesson','Comment','Status','SubjectN'],
							where:{
								RegisterId: register.Id,
								Pass: true
							}
						});
						if(subregisters.length > 0){
							await subregisters.reduce(async function(previousStudentPromise,student){
								await previousStudentPromise;							
								return new Promise(async function(resolve,reject){
									try{
										var params = new Array();
										var st = new Object()
										st.Date = register.LessonDate;
										st.EdUnitId = group.Id;
										st.StudentClientId = student.ClientId;
										st.Pass = false;
										st.Payable = false;
										st.overwriteAcceptedManually = true;
										params.push(st);
										await api.post(key.domain,'SetStudentPasses',params,key.apikey);


										var data = new Object();
										data.edUnitId = group.Id;
										data.studentClientId = student.ClientId;
										data.date = register.LessonDate;
										if(klass >= 0 && klass < 4){
											data.testTypeId = process.env.TEST_TYPE_ID_N;
											var skills = new Array();
											var skill = new Object();
											skill.skillId = process.env.SCORE_TEACHER_SKILL_ID; // ???????????? ??????????????
											skill.score = student.Homework;
											skills.push(skill);
											skill = new Object();
											skill.skillId = process.env.TEST_SKILL_ID; // ????????
											skill.score = student.Test;
											skills.push(skill);
											skill = new Object();
											skill.skillId = process.env.RANG_SKILL_ID; // ????????
											skill.score = student.Lesson;
											skills.push(skill);
											skill = new Object();
											skill.skillId = process.env.THEME_SKILL_ID; // ??????????????
											skill.score = student.SubjectN;
											skills.push(skill);			

											data.skills = skills;

										}else if(klass >=4 && klass <= 6){
											data.testTypeId = process.env.TEST_TYPE_ID_T;
											var skills = new Array();
											var skill = new Object();
											skill.skillId = process.env.SCORE_TEACHER_SKILL_ID; // ???????????? ??????????????
											skill.score = student.Homework;
											skills.push(skill);
											skill = new Object();
											skill.skillId = process.env.TEST_SKILL_ID; // ????????
											skill.score = student.Test;
											skills.push(skill);
											skill = new Object();
											skill.skillId = process.env.RANG_SKILL_ID; // ????????
											skill.score = student.Lesson;
											skills.push(skill);
											if(student.SubjectN){
												skill = new Object();
												skill.skillId = process.env.TOPIC_SKILL_ID; // ??????????????
												skill.score = student.SubjectN;
												skills.push(skill);			
											}else{
												skill = new Object();
												skill.skillId = process.env.TOPIC_SKILL_ID; // ??????????????
												skill.score = 0;
												skills.push(skill);
											}

											data.skills = skills;
										}else {
											data.testTypeId = process.env.TEST_TYPE_ID;
											var skills = new Array();
											var skill = new Object();
											skill.skillId = process.env.SCORE_TEACHER_SKILL_ID; // ???????????? ??????????????
											skill.score = student.Homework;
											skills.push(skill);
											skill = new Object();
											skill.skillId = process.env.TEST_SKILL_ID; // ????????
											skill.score = student.Test;
											skills.push(skill);
											skill = new Object();
											skill.skillId = process.env.RANG_SKILL_ID; // ????????
											skill.score = student.Lesson;
											skills.push(skill);
											data.skills = skills;
										}
										data.commentHtml = student.Comment;
										var res = await api.post(key.domain,'AddEditEdUnitTestResult',data,key.apikey);
										if(res.status == 200){
											await student.update({
												Status: false
											});
											resolve(true);
										}else{
											resolve(true);
										}									
									}catch(err){
										await sleep(100);
										sendTelegramIND(register,student);
										resolve(true);
									}
								});
							},Promise.resolve(true));
						}
					}
					resolve(true);
				}catch(err){
					console.log(err);
					resolve(true);
				}
			});
		},Promise.resolve(true));

		res.send('ok');
	}catch(err){
		console.log(err);
	}
});

router.post('/hhtoonline', async(req,res) => {
	try{
		var date = req.body.date;

		var hashmap = new HashMap();
		var params = `dateFrom=${date}&dateTo=${date}&TestTypeCategoryName=Attendance list&take=7000`;
		var EdUnitTestResults = await api.get(key.domain,'GetEdUnitTestResults',params,key.apikey);
		var attendances = EdUnitTestResults.data;

		attendances.map(function(attendance){
			if(hashmap.has(attendance.EdUnitId)){
				var group = hashmap.get(attendance.EdUnitId);

				if(!group.students.has(attendance.StudentClientId)){
					var obj = {};
					obj.StudentName = attendance.StudentName;
					obj.Skills = attendance.Skills;
					obj.com = attendance.CommentText ? attendance.CommentText : '';
					
					group.students.set(attendance.StudentClientId,obj);
					hashmap.set(attendance.EdUnitId,group);
				}
			}else{
				var map = new HashMap();
				var obj = {};
				obj.StudentName = attendance.StudentName;
				obj.Skills = attendance.Skills;
				obj.com = attendance.CommentText ? attendance.CommentText : '';
				map.set(attendance.StudentClientId,obj);

				var group = {};
				group.EdUnitId = attendance.EdUnitId;
				group.EdUnitName = attendance.EdUnitName;
				group.students = map;
				
				hashmap.set(attendance.EdUnitId,group);
			}
		});

		var groups = hashmap.keys();
		
		var check = new Date(date);
		var yesterday = new Date();
		
		yesterday.setDate(check.getDate()-1);
		yesterday = new Date(yesterday.toISOString().substr(0,10));

		await groups.reduce(async function(previousPromise,id){
			await previousPromise;
			return new Promise(async function(resolve,reject){
				await sleep(100);
				try{
					
					var param = `id=${id}`;
					var EdUnits = await api.get(key.domain,'GetEdUnits',param,key.apikey);
	
					var group = EdUnits.data;
					
					var obj = hashmap.get(id);

					
					obj.OfficeOrCompanyId = group[0].OfficeOrCompanyId;

					if(group[0].ScheduleItems.length == 1){
						obj.mainTeacherId = group[0].ScheduleItems[0].TeacherIds[0];
						obj.Time = group[0].ScheduleItems[0].BeginTime + '-' + group[0].ScheduleItems[0].EndTime;
						obj.Weekdays = Weekdays(group[0].ScheduleItems[0].Weekdays);
					}else {
						group[0].ScheduleItems.map(function(ScheduleItem){
							if(ScheduleItem.EndDate){
								var from = new Date(ScheduleItem.BeginDate);
								var to = new Date(ScheduleItem.EndDate);
								if( check > from && check < to && !obj.mainTeacherId){
									obj.mainTeacherId = ScheduleItem.TeacherIds[0];
									obj.Time = ScheduleItem.BeginTime + '-' + ScheduleItem.EndTime;
									obj.Weekdays = Weekdays(ScheduleItem.Weekdays);
								} 
								if( check.getTime() === from.getTime() && !obj.mainTeacherId){
									obj.mainTeacherId = ScheduleItem.TeacherIds[0];
									obj.Time = ScheduleItem.BeginTime + '-' + ScheduleItem.EndTime;	
									obj.Weekdays = Weekdays(ScheduleItem.Weekdays);
								} 
								if( check.getTime() === to.getTime() && !obj.mainTeacherId){
									obj.mainTeacherId = ScheduleItem.TeacherIds[0];
									obj.Time = ScheduleItem.BeginTime + '-' + ScheduleItem.EndTime;
									obj.Weekdays = Weekdays(ScheduleItem.Weekdays);
								} 
							}
						});

						group[0].ScheduleItems.map(function(ScheduleItem){
							if(!ScheduleItem.EndDate  && !obj.mainTeacherId ){
								obj.mainTeacherId = ScheduleItem.TeacherIds[0];
								obj.Time = ScheduleItem.BeginTime + '-' + ScheduleItem.EndTime;
								obj.Weekdays = Weekdays(ScheduleItem.Weekdays);
							}
						});
					
						group[0].ScheduleItems.map(function(ScheduleItem){
							if(ScheduleItem.EndDate){
								var from = new Date(ScheduleItem.BeginDate);
								var to = new Date(ScheduleItem.EndDate);
								
								
								if(check.getTime() === to.getTime() && check.getTime() === from.getTime()){
									obj.change = true;
									obj.subTeacherId = ScheduleItem.TeacherIds[0];
								}

								if(yesterday.getTime() === to.getTime() && !obj.mainTeacherId){
									obj.mainTeacherId = ScheduleItem.TeacherIds[0];
									obj.Time = ScheduleItem.BeginTime + '-' + ScheduleItem.EndTime;	
									obj.Weekdays = Weekdays(ScheduleItem.Weekdays);
								} 
							}
						});
					}
					
					hashmap.set(id,obj);
					resolve(true);
				}catch(err){
					console.log(err);
				}
			});
		},Promise.resolve(true));

		groups = hashmap.keys();

		var i = 0;
		var responses = [];
	
		await groups.reduce(async function(previousPromise ,id){
			await previousPromise;
			return new Promise(async function(resolve, reject){
				try{
					var obj = hashmap.get(id);
					if(obj.mainTeacherId){
						if(!obj.subTeacherId){
							var register = await Registers.findOne({
								attributes:['Id','GroupName','Time','LessonDate','WeekDays'],
								where:{
									[Op.and]:[
										{TeacherId: obj.mainTeacherId},
										{GroupId: obj.EdUnitId},
										{LessonDate:check}				
									]
								}
							});
							
							if(register === null){
								var Change = false;
								var LevelTest = '??????';
								var SubTeacherId = null;
								var TeacherId = obj.mainTeacherId;
								var GroupId = obj.EdUnitId;
								var GroupName = obj.EdUnitName;
								var Time = obj.Time;
								var LessonDate = date;
								var WeekDays = obj.Weekdays;
								var SubmitDay = new Date().toISOString().substr(0,10);
								var SubmitTime = '00:00:00';
								var IsSubmitted = true;
								var IsStudentAdd = false;
								var IsOperator = false;
								var SchoolId = obj.OfficeOrCompanyId;
								var Aibucks = 0;
								var TopicId = null;
								var RoomId = null;
								var Online = false;
								register = await Registers.create({
									Change,
									LevelTest,
									RoomId,
									SubTeacherId,
									TeacherId,
									GroupId,
									GroupName,
									Time,
									LessonDate,
									WeekDays,
									SubmitDay,
									SubmitTime,
									IsSubmitted,
									IsStudentAdd,
									IsOperator,
									SchoolId,
									Aibucks,
									TopicId,
									Online
								},{
									fields:['Change','LevelTest','RoomId','SubTeacherId','TeacherId','GroupId','GroupName','Time','LessonDate','WeekDays','SubmitDay','SubmitTime','IsSubmitted','IsStudentAdd','IsOperator','SchoolId','Aibucks','TopicId','Online']
								});

								if(register){
									var subregisters = [];

									var students = obj.students;
									var keys = students.keys();
									
									keys.map(function(studid){
										var student = students.get(studid);
										var subreg = {};
										var maxSrez = null;
										var aibaks = 0;
										subreg.ClientId = studid;
										subreg.FullName = student.StudentName;
										subreg.RegisterId = register.Id;
										subreg.Pass = true;
										subreg.Status = false;
										subreg.isWatched = false;
										

										student.Skills.map(function(skill){
											if(skill.SkillName == '????????'){
												subreg.Test = skill.Score;
											}else if(skill.SkillName == '???????????? ??????????????'){
												subreg.Homework = skill.Score;
											}else if(skill.SkillName == '????????'){
												subreg.Lesson = skill.Score;
											}else if(skill.SkillName == '???????? ??????????'){
												maxSrez = skill.Score;
											}
										});

										if(maxSrez && parseInt(maxSrez) > 0 && subreg.Test <= 100)
											aibaks += parseInt(Number((parseInt(subreg.Test)/parseInt(maxSrez))*30).toFixed(0));
										if (parseInt(subreg.Homework) <= 20)
											aibaks += parseInt(Number((parseInt(subreg.Homework)/20)*10).toFixed(0));
										if (parseInt(subreg.Lesson) > 0)
											aibaks += parseInt(Number((parseInt(subreg.Lesson)/100)*10).toFixed(0));
										
										subreg.Aibucks = aibaks;

										subregisters.push(subreg);
									});

									await SubRegisters.bulkCreate(subregisters,{
										fields:['RegisterId','ClientId','FullName','Pass','Homework','Test','Lesson','Comment','Status','isWatched','Aibucks']
									});
								}
							}
						} else {
							var register = await Registers.findOne({
								attributes:['Id','GroupName','Time','LessonDate','WeekDays'],
								where:{
									[Op.and]:[
										{
											[Op.or]:[
												{TeacherId: obj.subTeacherId},
												{TeacherId: obj.mainTeacherId},
											]
										},
										{GroupId: obj.EdUnitId},
										{LessonDate:check}				
									]
								}
							});
							
							if(register === null){
								var Change = false;
								var LevelTest = '??????';
								var SubTeacherId = obj.mainTeacherId;;
								var TeacherId = obj.subTeacherId;
								var GroupId = obj.EdUnitId;
								var GroupName = obj.EdUnitName;
								var Time = obj.Time;
								var LessonDate = date;
								var WeekDays = obj.Weekdays;
								var SubmitDay = new Date().toISOString().substr(0,10);
								var SubmitTime = '00:00:00';
								var IsSubmitted = true;
								var IsStudentAdd = false;
								var IsOperator = false;
								var SchoolId = obj.OfficeOrCompanyId;
								var Aibucks = 0;
								var TopicId = null;
								var RoomId = null;
								var Online = false;
								register = await Registers.create({
									Change,
									LevelTest,
									RoomId,
									SubTeacherId,
									TeacherId,
									GroupId,
									GroupName,
									Time,
									LessonDate,
									WeekDays,
									SubmitDay,
									SubmitTime,
									IsSubmitted,
									IsStudentAdd,
									IsOperator,
									SchoolId,
									Aibucks,
									TopicId,
									Online
								},{
									fields:['Change','LevelTest','RoomId','SubTeacherId','TeacherId','GroupId','GroupName','Time','LessonDate','WeekDays','SubmitDay','SubmitTime','IsSubmitted','IsStudentAdd','IsOperator','SchoolId','Aibucks','TopicId','Online']
								});

								if(register){
									var subregisters = [];

									var students = obj.students;
									var keys = students.keys();
									
									keys.map(function(studid){
										var student = students.get(studid);
										var subreg = {};
										subreg.ClientId = studid;
										subreg.FullName = student.StudentName;
										subreg.RegisterId = register.Id;
										subreg.Pass = true;
										subreg.Status = false;
										subreg.isWatched = false;
										subreg.Aibucks = 0;
										student.Skills.map(function(skill){
											if(skill.SkillName == '????????'){
												subreg.Test = skill.Score;
											}else if(skill.SkillName == '???????????? ??????????????'){
												subreg.Homework = skill.Score;
											}else if(skill.SkillName == '????????'){
												subreg.Lesson = skill.Score;
											}
										});

										subregisters.push(subreg);
									});

									var result = await SubRegisters.bulkCreate(subregisters,{
										fields:['RegisterId','ClientId','FullName','Pass','Homework','Test','Lesson','Comment','Status','isWatched','Aibucks']
									});
								}
							}
						}
					}else{
						responses.push(obj);
						i++;
					}
					resolve(true);
				}catch(err){
					console.log(err);
				}
			});	
		},Promise.resolve(true));

		res.send({status: "OK", data: responses});
	}catch(err){
		console.log(err);
	}
});


router.post('/teststohh', async(req,res) =>{
	
	try{
		var dateFrom = new Date(req.body.dateFrom);
		var dateTo = new Date(req.body.dateTo);
		const query = `SELECT reg."Id", reg."GroupName", reg."Time", reg."LessonDate", reg."WeekDays",
		reg."SubmitDay", reg."SubmitTime",reg."LevelTest",rom."Room",reg."Aibucks",reg."Online",top."Name" as "Topic",
		CASE 
			WHEN reg."GroupName" like '%RO%' THEN 'RO'
			WHEN reg."GroupName" like '%KO%' THEN 'KO'
		END AS "Branch", concat(teach."LastName",' ',teach."FirstName") as "FullName", concat(subteach."LastName",' ',subteach."FirstName") as "SubFullName",
		SUM(CASE WHEN subregAll."Pass" = :pass THEN 1 ELSE 0 END) as "Passed",COUNT(subregAll."Id") as "All", sch."Name", reg."Fine"
		FROM public."Registers" as reg
		LEFT JOIN public."Teachers" as teach ON reg."TeacherId" = teach."TeacherId"
		LEFT JOIN public."Teachers" as subteach ON reg."SubTeacherId" = subteach."TeacherId"
		LEFT JOIN public."SubRegisters" as subregAll ON reg."Id" = subregAll."RegisterId"
		LEFT JOIN public."Schools" as sch ON reg."SchoolId" = sch."SchoolId"
		LEFT JOIN public."Rooms" as rom ON rom."Id" = reg."RoomId"
		LEFT JOIN public."Topics" as top ON top."Id" = reg."TopicId"
		WHERE reg."LessonDate" BETWEEN :dateFrom AND :dateTo
		GROUP BY reg."Id",teach."LastName",teach."FirstName",sch."Name",rom."Room",subteach."LastName",subteach."FirstName",top."Name";`;
		var registers = await sequelize.query(query,{
			replacements:{dateFrom: dateFrom,dateTo: dateTo, pass:true},
			type: QueryTypes.SELECT
		});

		var i = 0;
		var monthTests = [];
		await registers.reduce(async function(previousPromise,register){
			await previousPromise;
			return new Promise(async function(resolve,reject){
				try{
					i++;
					var subject = support.Capitalize(support.subjectName(register.GroupName));
					await sleep(100);
					var subregisters = await SubRegisters.findAll({
						fields:['Id','ClientId','FullName','Pass','Homework','Test','Lesson','Comment','Status','SubjectN'],
						where:{
							RegisterId: register.Id,
							Pass: true
						}
					});
				
					await subregisters.reduce(async function(previousStudentPromise,student){
						await previousStudentPromise;							
						return new Promise(async function(resolve1,reject){
							try{
								var date = new Date(register.LessonDate);
								var tests = await VoksresTests.findAll({
									fields:['Id','ClientId','Subject','LessonDay','Score'],
									where:{
										ClientId: student.ClientId,
										LessonDay: date,
										Subject: subject
									}
								});
								tests.map(function(test){
									var obj = {};

									obj.Score = test.Score;
									obj.GroupName = register.GroupName;
									obj.ClientId = student.ClientId;
									obj.FullName = student.FullName;
									obj.Subject = test.Subject;
									obj.LessonDay = test.LessonDay;
									obj.Time = register.Time;
									obj.Filial = register.Name;
									obj.Branch = register.Branch;
									obj.Teacher = register.FullName;
									
									monthTests.push(obj);
								});

								resolve1(true);
							}catch(err){
								await sleep(100);
								resolve1(true);
							}
						});
					},Promise.resolve(true));

					resolve(true);
				}catch(err){
					console.log(err);
					resolve(true);
				}
			});
		},Promise.resolve(true));

		console.log(monthTests);
		var newWB = xlsx.utils.book_new();
		var newWS = xlsx.utils.json_to_sheet(monthTests);
		xlsx.utils.book_append_sheet(newWB,newWS,'sheet');
		xlsx.writeFile(newWB,'tests.xlsx');
		
	}catch(error){
		console.log(error);
	}
});


router.get('/gettests', async(req,res) => {
	try{

		var dateFrom = new Date(req.query.dateFrom);
		var dateTo = new Date(req.query.dateTo);

		const query = `SELECT reg."Id", reg."GroupName", reg."Time", reg."LessonDate", reg."WeekDays",
		CASE 
			WHEN reg."GroupName" like '%RO%' THEN 'RO'
			WHEN reg."GroupName" like '%KO%' THEN 'KO'
		END AS "Branch", concat(teach."LastName",' ',teach."FirstName") as "FullName", sch."Name"
		FROM public."Registers" as reg
		LEFT JOIN public."Teachers" as teach ON reg."TeacherId" = teach."TeacherId"
		LEFT JOIN public."Schools" as sch ON reg."SchoolId" = sch."SchoolId"
		WHERE reg."LessonDate" BETWEEN :dateFrom AND :dateTo
		GROUP BY reg."Id",teach."LastName",teach."FirstName",sch."Name";`;
		var registers = await sequelize.query(query,{
			replacements:{dateFrom: dateFrom,dateTo: dateTo, pass:true},
			type: QueryTypes.SELECT
		});

		var monthTests = [];
		await registers.reduce(async function(previousPromise,register){
			await previousPromise;
			return new Promise(async function(resolve,reject){
				try{
					var subject = support.Capitalize(support.subjectName(register.GroupName));
					var klass = support.getClass(register.GroupName);
					var subregisters = await SubRegisters.findAll({
						fields:['Id','ClientId','FullName','Pass','Homework','Test','Lesson','Comment','Status','SubjectN'],
						where:{
							RegisterId: register.Id,
							Pass: true
						}
					});
				
					await subregisters.reduce(async function(previousStudentPromise,student){
						await previousStudentPromise;							
						return new Promise(async function(resolve1,reject){
							try{
								var date = new Date(register.LessonDate);
								var tests = await VoksresTests.findAll({
									fields:['Id','ClientId','Subject','LessonDay','Score'],
									where:{
										ClientId: student.ClientId,
										LessonDay: date,
										Subject: subject
									}
								});
								tests.map(function(test){
									var obj = {};

									obj.Score = test.Score;
									obj.GroupName = register.GroupName;
									obj.ClientId = student.ClientId;
									obj.FullName = student.FullName;
									obj.Subject = test.Subject;
									obj.LessonDay = test.LessonDay;
									obj.Time = register.Time;
									obj.Filial = register.Name;
									obj.Branch = register.Branch;
									obj.Teacher = register.FullName;
									obj.Klass = klass;
									
									monthTests.push(obj);
								});

								resolve1(true);
							}catch(err){
								await sleep(100);
								resolve1(true);
							}
						});
					},Promise.resolve(true));

					resolve(true);
				}catch(err){
					console.log(err);
					resolve(true);
				}
			});
		},Promise.resolve(true));

		res.send({status: 200, data: monthTests});
	}catch(error){
		console.log(error);
	}
});


router.post('/deleteextrateacher', async(req, res) => {
	var teachers = await Teachers.findAll({
		attributes: ['TeacherId','ContactId']
	});
	
	teachers.reduce(async function(previousPromise, teacher){
		await previousPromise;

		return new Promise(async function(resolve,reject){
			try{
				var teacherHH = await api.get(key.domain,'GetTeachers','id='+teacher.TeacherId,key.apikey);

				if(teacherHH.data[0].Status != '??????????????????????????????????' && teacherHH.data[0].Status != '?????????????????????????????????????????/?????????????????????????????????'){
					await Teachers.destroy({
						where: {
							TeacherId: teacher.TeacherId
						}
					});
					await Contacts.destroy({
						where: {
							Id: teacher.ContactId
						}
					});
				}
			}catch(err){
				console.log(err);
			}
			
			resolve(true);
		});
	},Promise.resolve(true));

	res.send("ok");
 });
 
 router.post('/getexceljournals',async(req,res) => {
	try{
		var dateFrom = new Date(req.body.dateFrom);
		var dateTo = new Date(req.body.dateTo);
		
		const query = `SELECT reg."Id", reg."GroupName", reg."Time", reg."LessonDate", reg."WeekDays",
		reg."SubmitDay", reg."SubmitTime",reg."LevelTest",rom."Room",reg."Aibucks",reg."Online",reg."Paperdone",top."Name" as "Topic",
		CASE 
			WHEN reg."GroupName" like '%RO%' THEN 'RO'
			WHEN reg."GroupName" like '%KO%' THEN 'KO'
		END AS "Branch", reg."TeacherId", concat(teach."LastName",' ',teach."FirstName") as "FullName", concat(subteach."LastName",' ',subteach."FirstName") as "SubFullName",
		SUM(CASE WHEN subregAll."Pass" = :pass THEN 1 ELSE 0 END) as "Passed",COUNT(subregAll."Id") as "All", sch."Name", reg."Fine",teach."Rate60",teach."Rate90",
		'Registers' as "Source"
		FROM public."Registers" as reg
		LEFT JOIN public."Teachers" as teach ON reg."TeacherId" = teach."TeacherId"
		LEFT JOIN public."Teachers" as subteach ON reg."SubTeacherId" = subteach."TeacherId"
		LEFT JOIN public."SubRegisters" as subregAll ON reg."Id" = subregAll."RegisterId"
		LEFT JOIN public."Schools" as sch ON reg."SchoolId" = sch."SchoolId"
		LEFT JOIN public."Rooms" as rom ON rom."Id" = reg."RoomId"
		LEFT JOIN public."Topics" as top ON top."Id" = reg."TopicId"
		WHERE reg."LessonDate" BETWEEN :dateFrom AND :dateTo
		GROUP BY reg."Id",teach."LastName",teach."FirstName",sch."Name",rom."Room",subteach."LastName",subteach."FirstName",top."Name",teach."Rate60",teach."Rate90"
		UNION 
		SELECT bumreg."Id", bumreg."GroupName", bumreg."Time", bumreg."LessonDate", bumreg."WeekDays",
		bumreg."SubmitDay", bumreg."SubmitTime",bumreg."LevelTest",rom."Room",bumreg."Aibucks",bumreg."Online",bumreg."Paperdone",top."Name" as "Topic",
		CASE 
			WHEN bumreg."GroupName" like '%RO%' THEN 'RO'
			WHEN bumreg."GroupName" like '%KO%' THEN 'KO'
		END AS "Branch",bumreg."TeacherId", concat(teach."LastName",' ',teach."FirstName") as "FullName", concat(subteach."LastName",' ',subteach."FirstName") as "SubFullName",
		SUM(CASE WHEN bumsubregAll."Pass" = :pass THEN 1 ELSE 0 END) as "Passed",COUNT(bumsubregAll."Id") as "All", sch."Name", bumreg."Fine",teach."Rate60",teach."Rate90",
		'BumRegisters' as "Source"
		FROM public."BumRegisters" as bumreg
		LEFT JOIN public."Teachers" as teach ON bumreg."TeacherId" = teach."TeacherId"
		LEFT JOIN public."Teachers" as subteach ON bumreg."SubTeacherId" = subteach."TeacherId"
		LEFT JOIN public."BumSubRegisters" as bumsubregAll ON bumreg."Id" = bumsubregAll."RegisterId"
		LEFT JOIN public."Schools" as sch ON bumreg."SchoolId" = sch."SchoolId"
		LEFT JOIN public."Rooms" as rom ON rom."Id" = bumreg."RoomId"
		LEFT JOIN public."Topics" as top ON top."Id" = bumreg."TopicId"
		WHERE bumreg."LessonDate" BETWEEN :dateFrom AND :dateTo
		GROUP BY bumreg."Id",teach."LastName",teach."FirstName",sch."Name",rom."Room",subteach."LastName",subteach."FirstName",top."Name",teach."Rate60",teach."Rate90";`;
		
		var registers = await sequelize.query(query,{
			replacements:{dateFrom: dateFrom,dateTo: dateTo, pass:true},
			type: QueryTypes.SELECT
		});

		registers.map(function(register){
			var subject = support.subjectName(register.GroupName);
			register.Subject = subject;
		});
		
		var teacherIdList = [...new Set(registers.map(register=>register.TeacherId))];
		var salaryList = [];
		var problems = [];
		
		teacherIdList.map(function(teacherId){
			var registerList = registers.filter(register => register.TeacherId == teacherId);
			var changeList = registers.filter(register => register.SubFullName == registerList[0].FullName);
			var result = support.CalculateDays(registerList);
			var subjectTeacher = '';
			var department = '';
			var arr = [];
			arr[0] = teacherId;
			arr[1] = registerList[0].FullName;
			
			var subjectList = [...new Set(registerList.map(register=>register.Subject))];
			if(subjectList.length == 1){
				subjectTeacher = subjectList[0];
			}else{
				var maxim = 0;
				subjectList.map(function(subject){
					var filtered = registerList.filter(register => register.Subject == subject);
					if(maxim < filtered.length){
						max = filtered.length;
						subjectTeacher = subject;
					}						
				});
			}
			
			switch(subjectTeacher){
				case '????????????????????':
					department = '????????????????????';
					break;
				case '????????????':
					department = '????????????????????';
					break;
				case '??????????????????':
					department = '????????????????????';
					break;
				case '??????????????':
					department = '????????????????????';
					break;
				case '??????. ??????????????????????':
					department = '????????????????????';
					break;
				case '?????????????????? ????????':
					department = '?????????????????? ????????';
					break;
				case '?????????????? ????????':
					department = '?????????????? ????????';
					break;
				case '???????????????????? ????????':
					department = '???????????????????? ????????';
					break;
				case '??????????????':
					department = '??????????????';
					break;
				default:
					department = '??????';
					break;
			}
			
			arr[2] = department;
			arr[3] = registerList[0].Rate60;
			arr[4] = registerList[0].Rate90;
			arr[5] = result.hour;
			arr[6] = result.fines;
			arr[7] = changeList.length;
			salaryList.push(arr);
			problems = problems.concat(result.problems);
			
		});
		var header = ['TeacherId','?????? ??????????????','??????????????','???????????? ???? 60','???????????? ???? 90','???????????????????? ???????????? ???? 60','?????????????????? (??????????)','???????????????????? ??????????'];
		salaryList.sort((a,b) => a[1].localeCompare(b[1]));
		salaryList.unshift(header);
		var newWB = xlsx.utils.book_new();
		var salary = xlsx.utils.aoa_to_sheet(salaryList);
		var journal = xlsx.utils.json_to_sheet(registers);
		var problemSheet = xlsx.utils.json_to_sheet(problems);
		xlsx.utils.book_append_sheet(newWB,salary,'salary');
		xlsx.utils.book_append_sheet(newWB,journal,'journal');
		xlsx.utils.book_append_sheet(newWB,problemSheet,'problem');
		xlsx.writeFile(newWB,'journals.xlsx');
		res.send({status: 200, data: []});
	}catch(error){
		console.log(error);
        res.send({status: 500,data: []});
	}
});

router.get('/getGeneralReport',async(req,res) => {
	try{
		var dateFrom = new Date(req.query.dateFrom);
		var dateTo = new Date(req.query.dateTo);
		const query = `SELECT reg."Id", reg."GroupName",reg."GroupId", reg."Time", reg."LessonDate", reg."WeekDays",
		reg."SubmitDay", reg."SubmitTime",reg."LevelTest",rom."Room",reg."Aibucks",reg."Online",top."Name" as "Topic",
		CASE 
			WHEN reg."GroupName" like '%RO%' THEN 'RO'
			WHEN reg."GroupName" like '%KO%' THEN 'KO'
		END AS "Branch", concat(teach."LastName",' ',teach."FirstName") as "FullName", concat(subteach."LastName",' ',subteach."FirstName") as "SubFullName",
		SUM(CASE WHEN subregAll."Pass" = :pass THEN 1 ELSE 0 END) as "Passed",COUNT(subregAll."Id") as "All", sch."Name", reg."Fine",teach."Rate60",teach."Rate90"
		FROM public."Registers" as reg
		LEFT JOIN public."Teachers" as teach ON reg."TeacherId" = teach."TeacherId"
		LEFT JOIN public."Teachers" as subteach ON reg."SubTeacherId" = subteach."TeacherId"
		LEFT JOIN public."SubRegisters" as subregAll ON reg."Id" = subregAll."RegisterId"
		LEFT JOIN public."Schools" as sch ON reg."SchoolId" = sch."SchoolId"
		LEFT JOIN public."Rooms" as rom ON rom."Id" = reg."RoomId"
		LEFT JOIN public."Topics" as top ON top."Id" = reg."TopicId"
		WHERE reg."LessonDate" BETWEEN :dateFrom AND :dateTo
		GROUP BY reg."Id",teach."LastName",teach."FirstName",sch."Name",rom."Room",subteach."LastName",subteach."FirstName",top."Name",teach."Rate60",teach."Rate90";`;
		
		var registers = await sequelize.query(query,{
			replacements:{dateFrom: dateFrom,dateTo: dateTo, pass:true},
			type: QueryTypes.SELECT
		});
		function getDatesInRange(startDate, endDate) {
			const date = new Date(startDate.getTime());
			const dates = [];
			while (date <= endDate) {
			  dates.push(new Date(date));
			  date.setDate(date.getDate() + 1);
			}
			return dates;
		  }
		  
		dates = getDatesInRange(dateFrom,dateTo);
		for (i in dates) {
			TempTime = dates[i].toISOString().split("T");
			dates[i] = TempTime[0];
		}
		
		var reports = new Array();
		for (date of dates){
			var GroupIds = new Array();
			var obj = new Object();
			var countId = 0;
			var Aibucks = 0;
			var countGroup = 0;
			var countGroupEmp = 0;
			var countInd = 0;
			var countIndEmp = 0;
			var AibucksPerLesson = 0;
			var countChange = 0;
			var countPaper = 0;
			var countSubTimeDiff = 0;
			var countSubTime1900 = 0;
			var countDoubleLess = 0;
			flag = false;
			registers.map(function(register){
				if (date == register.LessonDate){
					flag = true;
					tempRegDate = register.LessonDate;
					countId++;
					Aibucks = Aibucks + register.Aibucks;
					var splitGroupName = register.GroupName.split(".");
					if(splitGroupName[0] == 'IND'){
						if(register.Passed == 0){
							countIndEmp++;
						}
						else{
							countInd++;
						}
					}
					else{
						if(register.Passed == 0){
							countGroupEmp++;
						}
						else{
							countGroup++;
						}
					}
					if(register.SubFullName.length > 1){
						countChange++;
					}
					if(register.Online == false){
						countPaper++;
					}
					if(GroupIds.includes(register.GroupId)){
						countDoubleLess++;
					}
					GroupIds.push(register.GroupId);
					if(register.SubmitDay != register.LessonDate){
						countSubTimeDiff++;
					}
					splittedTime = register.SubmitTime.split(':');
					SubmitTime = splittedTime[0];
					SubmitTime = parseInt(SubmitTime);
					if(SubmitTime > 19 || SubmitTime < 6){
						countSubTime1900++;
					}
				}
			});
			if(flag){
				obj.LessonDate = tempRegDate;
				AibucksPerLesson = Aibucks/countId;
				AibucksPerLesson = AibucksPerLesson.toFixed(3);
				obj.AllLessons = countId;
				obj.Aibucks = Aibucks;
				obj.Group = countGroup;
				obj.EmpGroup = countGroupEmp;
				obj.Ind = countInd;
				obj.EmpInd = countIndEmp;
				obj.AibucksPerLess = AibucksPerLesson;
				obj.Change = countChange;
				obj.Paper = countPaper;
				obj.SubmitTimeDiff = countSubTimeDiff;
				obj.SubmitAfter = countSubTime1900;
				obj.DoubleSubmit = countDoubleLess;
				reports.push(obj);
			}
		}	

		var obj = new Object();
		var countId = 0;
		var Aibucks = 0;
		var countGroup = 0;
		var countGroupEmp = 0;
		var countInd = 0;
		var countIndEmp = 0;
		var AibucksPerLesson = 0;
		var countChange = 0;
		var countPaper = 0;
		var countSubTimeDiff = 0;
		var countSubTime1900 = 0;
		var countDoubleLess = 0;
		reports.sort(support.compareReportDate);

		reports.map(function(report){
			report.LessonDate = report.LessonDate.split('-').reverse().join('.');
			countId += report.AllLessons;
			Aibucks += report.Aibucks;
			countGroup += report.Group;
			countGroupEmp += report.EmpGroup;
			countInd += report.Ind;
			countIndEmp += report.EmpInd;
			AibucksPerLesson += report.AibucksPerLess;
			countChange += report.Change;
			countPaper += report.Paper;
			countSubTimeDiff += report.SubmitTimeDiff;
			countSubTime1900 += report.SubmitAfter;
			countDoubleLess += report.DoubleSubmit;
		});
		obj.LessonDate = '??????????';
		obj.AllLessons = countId;
		obj.Aibucks = Aibucks;
		obj.Group = countGroup;
		obj.EmpGroup = countGroupEmp;
		obj.Ind = countInd;
		obj.EmpInd = countIndEmp;
		AibucksPerLesson = Aibucks/countId;
		AibucksPerLesson = AibucksPerLesson.toFixed(3);
		obj.AibucksPerLess = AibucksPerLesson;
		obj.Change = countChange;
		obj.Paper = countPaper;
		obj.SubmitTimeDiff = countSubTimeDiff;
		obj.SubmitAfter = countSubTime1900;
		obj.DoubleSubmit = countDoubleLess;
		reports.unshift(obj);
		res.send({status: 200, data: reports});
	}catch(error){
		console.log(error);
        res.send({status: 500,data: []});
	}
});

router.get('/getDayReport',async(req,res) => {
	try{
		var dateFrom = new Date(req.query.dateFrom);
		

		const query = `SELECT reg."Id", reg."GroupName",reg."GroupId", reg."Time", reg."LessonDate", reg."WeekDays",
		reg."SubmitDay", reg."SubmitTime",reg."LevelTest",rom."Room",reg."Aibucks",reg."Online",top."Name" as "Topic",
		CASE 
			WHEN reg."GroupName" like '%RO%' THEN 'RO'
			WHEN reg."GroupName" like '%KO%' THEN 'KO'
		END AS "Branch", concat(teach."LastName",' ',teach."FirstName") as "FullName", concat(subteach."LastName",' ',subteach."FirstName") as "SubFullName",
		SUM(CASE WHEN subregAll."Pass" = :pass THEN 1 ELSE 0 END) as "Passed",COUNT(subregAll."Id") as "All", sch."Name", reg."Fine",teach."Rate60",teach."Rate90"
		FROM public."Registers" as reg
		LEFT JOIN public."Teachers" as teach ON reg."TeacherId" = teach."TeacherId"
		LEFT JOIN public."Teachers" as subteach ON reg."SubTeacherId" = subteach."TeacherId"
		LEFT JOIN public."SubRegisters" as subregAll ON reg."Id" = subregAll."RegisterId"
		LEFT JOIN public."Schools" as sch ON reg."SchoolId" = sch."SchoolId"
		LEFT JOIN public."Rooms" as rom ON rom."Id" = reg."RoomId"
		LEFT JOIN public."Topics" as top ON top."Id" = reg."TopicId"
		WHERE reg."LessonDate" = :dateFrom
		GROUP BY reg."Id",teach."LastName",teach."FirstName",sch."Name",rom."Room",subteach."LastName",subteach."FirstName",top."Name",teach."Rate60",teach."Rate90";`;
		
		var registers = await sequelize.query(query,{
			replacements:{dateFrom: dateFrom, pass:true},
			type: QueryTypes.SELECT
		});

		var reports = new Array();

		var Topics = [
			{
				subj: 'M',
				branch: 'KO',
				disc :'???????????????????? ????'
			},
			{
				subj: 'L',
				branch: 'KO',
				disc :'???????????? ????'
			},
			{
				subj: 'GM',
				branch: 'KO',
				disc :'?????????????????? ????'
			},
			{
				subj: 'M',
				branch: 'RO',
				disc :'???????????????????? ????'
			},
			{
				subj: 'L',
				branch: 'RO',
				disc :'???????????? ????'
			},
			{
				subj: 'GM',
				branch: 'RO',
				disc :'?????????????????? ????'
			},
			{
				subj: 'E',
				branch: '',
				disc :'???????????????????? ????????'
			},
			{
				subj: 'R',
				branch: '',
				disc :'?????????????? ????????'
			},
			{
				subj: 'K',
				branch: '',
				disc :'?????????????????? ????????'
			},
			{
				subj: 'N',
				branch: '',
				disc :'??????????????'
			},
			{
				subj: 'F',
				branch: '',
				disc :'????????????'
			},
			{
				subj: 'ENT',
				branch: '',
				disc :'??????'
			},
		];
		
		
		
		Topics.map(function(Topic){
			var GroupIds = new Array();
			var obj = new Object();
			var countId = 0;
			var Aibucks = 0;
			var countGroup = 0;
			var countGroupEmp = 0;
			var countInd = 0;
			var countIndEmp = 0;
			var AibucksPerLesson = 0;
			var countChange = 0;
			var countPaper = 0;
			var countSubTimeDiff = 0;
			var countSubTime1900 = 0;
			var countDoubleLess = 0;
			flag = false;
			registers.map(function(register){
				console.log(register)
				var splitGroupName = register.GroupName.split(".");
				if  ((Topic.subj == splitGroupName[0] || Topic.subj == splitGroupName[1]) && (Topic.branch == splitGroupName[2] || Topic.branch == splitGroupName[3])){
					flag = true;
					console.log('MATH');
					countId++;
					Aibucks = Aibucks + register.Aibucks;
					if(splitGroupName[0] == 'IND'){
						if(register.Passed == 0){
							countIndEmp++;
						}
						else{
							countInd++;
						}
					}
					else{
						if(register.Passed == 0){
							countGroupEmp++;
						}
						else{
							countGroup++;
						}
					}
					if(register.SubFullName.length > 1){
						countChange++;
					}
					if(register.Online == false){
						countPaper++;
					}
					if(GroupIds.includes(register.GroupId)){
						countDoubleLess++;
					}
					GroupIds.push(register.GroupId);
					if(register.SubmitDay != register.LessonDate){
						countSubTimeDiff++;
					}
					splittedTime = register.SubmitTime.split(':');
					SubmitTime = splittedTime[0];
					SubmitTime = parseInt(SubmitTime);
					if(SubmitTime > 19 || SubmitTime < 6){
						countSubTime1900++;
					}
				}
				else if((Topic.subj == splitGroupName[0] || Topic.subj == splitGroupName[1]) && Topic.branch == ''){
					console.log('SINGLE');
					flag = true;
					countId++;
					Aibucks = Aibucks + register.Aibucks;
					if(splitGroupName[0] == 'IND'){
						if(register.Passed == 0){
							countIndEmp++;
						}
						else{
							countInd++;
						}
					}
					else{
						if(register.Passed == 0){
							countGroupEmp++;
						}
						else{
							countGroup++;
						}
					}
					if(register.SubFullName.length > 1){
						countChange++;
					}
					if(register.Online == false){
						countPaper++;
					}
					if(GroupIds.includes(register.GroupId)){
						countDoubleLess++;
					}
					GroupIds.push(register.GroupId);
					if(register.SubmitDay != register.LessonDate){
						countSubTimeDiff++;
					}
					splittedTime = register.SubmitTime.split(':');
					SubmitTime = splittedTime[0];
					SubmitTime = parseInt(SubmitTime);
					if(SubmitTime > 19 || SubmitTime < 6){
						countSubTime1900++;
					}
				}
				else if(splitGroupName[0] == 'CHOP' || splitGroupName[0] == 'MG'|| splitGroupName[0] == 'G'|| splitGroupName[0] == 'CH'|| splitGroupName[0] == 'WH'|| splitGroupName[0] == 'HK'|| splitGroupName[0] == 'B'
				|| splitGroupName[1] == 'CHOP'|| splitGroupName[1] == 'MG'|| splitGroupName[1] == 'G'|| splitGroupName[1] == 'CH'|| splitGroupName[1] == 'WH'|| splitGroupName[1] == 'HK'|| splitGroupName[1] == 'B'){
					console.log('ENT');
					flag = true;
					countId++;
					Aibucks = Aibucks + register.Aibucks;
					if(splitGroupName[0] == 'IND'){
						if(register.Passed == 0){
							countIndEmp++;
						}
						else{
							countInd++;
						}
					}
					else{
						if(register.Passed == 0){
							countGroupEmp++;
						}
						else{
							countGroup++;
						}
					}
					if(register.SubFullName.length > 1){
						countChange++;
					}
					if(register.Online == false){
						countPaper++;
					}
					if(GroupIds.includes(register.GroupId)){
						countDoubleLess++;
					}
					GroupIds.push(register.GroupId);
					if(register.SubmitDay != register.LessonDate){
						countSubTimeDiff++;
					}
					splittedTime = register.SubmitTime.split(':');
					SubmitTime = splittedTime[0];
					SubmitTime = parseInt(SubmitTime);
					if(SubmitTime > 19 || SubmitTime < 6){
						countSubTime1900++;
					}
				}
			});
			if(flag){
				obj.Discipline = Topic.disc;
				AibucksPerLesson = Aibucks/countId;
				AibucksPerLesson = AibucksPerLesson.toFixed(3);
				obj.AllLessons = countId;
				obj.Aibucks = Aibucks;
				obj.Group = countGroup;
				obj.EmpGroup = countGroupEmp;
				obj.Ind = countInd;
				obj.EmpInd = countIndEmp;
				obj.AibucksPerLess = AibucksPerLesson;
				obj.Change = countChange;
				obj.Paper = countPaper;
				obj.SubmitTimeDiff = countSubTimeDiff;
				obj.SubmitAfter = countSubTime1900;
				obj.DoubleSubmit = countDoubleLess;
				reports.push(obj);
			}
		});
		
		res.send({status: 200, data: reports});
	}catch(error){
		console.log(error);
        res.send({status: 500,data: []});
	}
});


module.exports = router;