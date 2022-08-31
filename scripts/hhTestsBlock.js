const Promise = require('bluebird');
const api = require('../api/api');
const object = require('../config/onlineTestHH');

const key = {
    "domain": process.env.DOMAIN,
    "apikey": process.env.APIKEY
};


function sleep(ms){
	console.log(`Ждем ${ms}`);
    return new Promise(resolve=>{
        setTimeout(resolve,ms)
    });
}

async function setPersonalResult(tests){
	try{
		await sleep(1000);
		await tests.reduce(async function(previousPromise,record){
			await previousPromise;
			return new Promise(async function(resolve,reject){
				try{
                    var elem = object.test.find(el => el.subject == record.Subject)
				    var blockId = elem.blocks.find(el => el.block == record.Block);
                    if(blockId){
                        await sleep(10);
					
                        var data = new Object();
                        data.discipline = record.Subject;
                        data.studentClientId = record.ClientId;
                        data.dateTime = record.LessonDay;
                        data.testTypeId = blockId.id;
                        var skills = [{skillId: elem.subjectId,score: record.Score}];
                        data.skills = skills;
                        data.commentHtml = '';
    
                        await api.post(key.domain,'AddEditPersonalTestResult',data,key.apikey);
                    }
					
					resolve(true);
				}catch(err){
					console.log(err);
					resolve(false);
				}
			});
		},Promise.resolve(true));
	}catch(error){
		console.log(error);
	}
}


module.exports = setPersonalResult;