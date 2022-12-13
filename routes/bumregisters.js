const express = require('express');
const router = express.Router();

const BumRegister = require('../modules/BumRegister');

//add
router.post('/', async (req,res) => {
	var { TeacherId, GroupId, GroupName, Time, LessonDate, WeekDays, SubmitDay, SubmitTime, IsSubmitted, IsStudentAdd, IsOperator,SchoolId } = req.body;
	try{
		var newRegister = await BumRegister.create({
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
            Class,
			subject
		},{
			fields:['TeacherId','GroupId','GroupName','Time','LessonDate','WeekDays','SubmitDay','SubmitTime','IsSubmitted','IsStudentAdd','IsOperator','SchoolId']
		});
		if(newRegister){
			res.json({
				result: 'ok',
				data: newRegister
			});
		} else {
			res.json({
				result: 'failed',
				data: {},
				message: 'Добавление Регистра провалено.'
			});
		}
	}catch(error){
		res.json({
			result: 'failed',
			data: {},
			message: `Добавление Регистра провалено. Ошибка: ${error}`
		});
	}
});

//update
router.put('/:Id',async (req,res) => {
	const {Id} = req.params;
	const { TeacherId, GroupId, GroupName, Time, LessonDate, WeekDays, SubmitDay, SubmitTime, IsSubmitted, IsStudentAdd, IsOperator,SchoolId,Fine,paperdone } = req.body;
	try{
		var bumregisters = await BumRegister.findAll({
			fields:['TeacherId','GroupId','GroupName','Time','LessonDate','WeekDays','SubmitDay','SubmitTime','IsSubmitted','IsStudentAdd','IsOperator','SchoolId','Fine','paperdone'],
			where: {
				Id
			}
		});
		if(bumregisters.length > 0){
			bumregisters.map(async (bumregister) =>{
				await bumregister.update({
					TeacherId: TeacherId ? TeacherId : bumregister.TeacherId,
					GroupId: GroupId ? GroupId : bumregister.GroupId,
					GroupName: GroupName ? GroupName : bumregister.GroupName,
					Time: Time ? Time : bumregister.Time,
					LessonDate: LessonDate ? LessonDate : bumregister.LessonDate,
					WeekDays: WeekDays ? WeekDays : bumregister.WeekDays,
					SubmitDay: SubmitDay ? SubmitDay : bumregister.SubmitDay,
					SubmitTime: SubmitTime ? SubmitTime : bumregister.SubmitTime,
					IsSubmitted: IsSubmitted ? IsSubmitted : bumregister.IsSubmitted,
					IsStudentAdd: IsStudentAdd ? IsStudentAdd : bumregister.IsStudentAdd,
					IsOperator: IsOperator ? IsOperator : bumregister.IsOperator,
					SchoolId: SchoolId ? SchoolId : bumregister.SchoolId,
					Fine: Fine ? Fine: bumregister.Fine ,
                    paperdone: paperdone ? paperdone: bumregister.paperdone 

				});	
			});
			res.json({
				result: 'ok',
				data: bumregisters,
				message: "Обновление Регистров прошла успешна"
			});
		} else {
			res.json({
				result: 'failed',
				data: {},
				message: "Обновление Регистров провалено"
			});
		} 
	}catch(error){
		res.json({
			result: 'failed',
			data: {},
			message: `Обновление Регистров провалено. Ошибка: ${error}`
		});	
	}
});


//delete
router.delete('/:id', async (req,res) => {
	const { id } = req.params;
	try{
		var deletedRows = await BumRegister.destroy({
			where: {
				Id: id
			}
		});
		res.json({
			result: 'ok',
			message: 'Удаление Регистров успешно',
			count: deletedRows
		});
	}catch(error){
		res.json({
			result: 'failed',
			data: {},
			message: `Удаление Регистров провалено. Ошибка: ${error}`
		});
	}
});

//query all data
router.get('/', async (req,res) => {
	try{
		const bumregisters = await BumRegister.findAll({
			fields:['TeacherId','GroupId','GroupName','Time','LessonDate','WeekDays','SubmitDay','SubmitTime','IsSubmitted','IsStudentAdd','IsOperator'],
		});
		res.json({
			result: 'ok',
			data: bumregisters,
			message: 'Выгрузка всех данных успешно'
		});
	}catch(error){
		res.json({
			result: 'failed',
			data: [],
			message: `Выгрузка всех данных провалено. Ошибка : ${error}`
		});
	}
});

module.exports = router;