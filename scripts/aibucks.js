const Promise = require('bluebird');
const api = require('../api/api');
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

async function setAibucks(students){
	try{

		await sleep(1000);
		var responses = [];
		await students.reduce(async function(previousPromise,student){
			var res = await previousPromise;
			responses.push(res);
			return new Promise(async function(resolve,reject){
				try{
					await sleep(10);
					if(student.aibaks && student.clientid != -1 && !student.status && !student.delete){
						console.log(student,'hahaha')
                        var extraFields = [];

						var response = await api.get('aiplusonline','GetStudents','clientId='+student.clientid,key.apikey);
                        var fieldValue = 0

                        if(response.data[0].ExtraFields){
                            response.data[0].ExtraFields.map(function(field){
                                var name = field.Name.toLowerCase();
                                var value = field.Value;
                                if(name == 'сумма айбаксов'){
                                    console.log(value,'aaaaaa')
                                    fieldValue+=parseInt(value);
                                }
                            });
                        }
                        console.log(fieldValue,'ssss')
                        console.log(student.aibaks,'aadsdsdsds')

                        fieldValue+=parseInt(student.aibaks);

                        if(response.data[0].ExtraFields){
                            response.data[0].ExtraFields.map(function(field){
                                var obj = {};
                                obj.name = field.Name;
                                obj.value = field.Value;
                                extraFields.push(obj);
                            });
                            var obj = {};
                            obj.name = 'сумма Айбаксов';
                            obj.value = fieldValue;
                            extraFields.push(obj);
                        }
                
                        var data = {};
                        data.studentClientId = student.clientid;
                        data.fields = extraFields;

						var response = await api.post('aiplusonline','EditUserExtraFields',data,key.apikey);;
						if(response.status == 200)
							resolve(true);
						else
							reject(false);
					} else {
						resolve(true);
					}
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



module.exports = setAibucks;