const { URL } = require("url");
const _ = require("lodash");
const UserModel = require("./../models/user.model");
const { getOrGenImg, makeNapChartImageUrl } = require("./../imageCache");
const schedules = require("./schedules").schedules
const modifiers = require("./schedules").modifiers


module.exports = {
	setInternal: function(args, message, dry, author=null, member=null) {
		if (author == null) { author = message.author }
		if (member == null) { member = message.member }
		set(args, message, dry, author, member, false);
	},
	setInternalPromise: function(args, message, dry, author=null, member=null, silent = true) {
		return new Promise(function (resolve, reject) {
			if (author == null) { author = message.author }
			if (member == null) { member = message.member }
			resolve(set(args, message, dry, author, member, silent))
		})
	}
};


//Returns true if both schedule and napchart are set
//silent supresses dicord text output only, changes still take place
//(provided dry=false)
async function set(args, message, dry, author, member, silent) {
	complete = true
	let msg = "";
	let urlPossible = args.length === 2 ? args[1] : args[0];
	let schedulePossible = args[0]

	console.log("CMD   : SET")
	console.log("ARGS  : ", args)

	//DONE GET URL, GET User Name
	//TODO HANDLE doubles

	//If schedule only, wipe chart
	if (args[0] === "none") {
		console.log("ACT   : ", "Remove napchart from database for " +author.username)
		await saveUserSchedule(message, buildUserInstance());
		msg = "Nap Chart has been removed for " + author.tag + "."
		console.log("MSG   : ", msg)
		if(!dry&&!silent){message.channel.send(msg);}
		if (args.length == 1) { return false; }
	}

	var { is_nurl, nurl } = checkIsUrlAndGet(urlPossible);
	var { is_schedule, schedn, schedfull } = checkIsSchedule(schedulePossible);
	if (args.length === 2 && (!is_schedule || !(is_nurl || args[1] === "none")) ||
		(!is_nurl && !is_schedule)) {
		msg = "Invalid `+set` format, use `+set [url]`, `+set [schedule]`, `+set [schedule] [url]` or see +help for details."
		console.log("MSG   : ", msg)
		if(!dry&&!silent){message.channel.send(msg);}
		console.error("ERR>>>: ", "Set command was rejected with args", args)
		return false;
	}

	let userUpdate = buildUserInstance();

	let result = await saveUserSchedule(message, userUpdate);

	// We received Napchart, cache it:
	if (is_nurl) {
		if (nurl.host == "napchart.com") {
			//Dry run, we are caching
			getOrGenImg(nurl, message, true);
		}
	}


	// We received Schedule change, process it:
	if (is_schedule) {
		ptag = ` [${schedfull}]`;
		if (member.nickname == null) {
			new_username = author.username
		} else {
			new_username = member.nickname
			ptag_start = new_username.lastIndexOf(' [')
			if (ptag_start != -1) {
				new_username = new_username.slice(0,ptag_start)
			}
		}
		lngt = new_username.length + ptag.length
		if(lngt>32) {
			new_username = new_username.slice(0,32-lngt)
			msg = "Username had to be shortened because it was too long to fit the tag. Contact moderators if you want it changed."
			console.log("MSG   : ", msg)
			if(!dry&&!silent){message.channel.send(msg);}
		}
		new_username = new_username + ptag

		console.log("ACT   : ", "Change usrname for " +author.username + " to "+new_username)
		if(!dry){member.setNickname(new_username);}
		msg = "Schedule set for " + author.tag + " to `" + args[0] + "`.";
		console.log("MSG   : ", msg)
		if(!dry&&!silent){message.channel.send(msg);}

		let roles =  member.roles
		roles = new Set(roles.keys())

		let newRole = schedules[schedn].category;
		let role = message.guild.roles.find("name", newRole);
		Object.values(schedules).forEach(sch=>{
			if(message.guild.roles.find("name",sch.category)==null){
				console.log("WARN  : ", sch.category, "is not present")
			} else {
				roles.delete(message.guild.roles.find("name",sch.category).id)
			}
		})
		roles.add(role.id)
		console.log("ACT   : ", "Change role for " +author.tag + " to "+newRole)
		if(!dry){member.setRoles(Array.from(roles));}
	} else {
		complete = false;
	}

	// We received Napchart, process it:
	if (is_nurl) {
		msg = "Nap Chart set for " + author.tag + " to " + nurl.href + "."
		console.log("MSG   : ", msg)
		if(!dry&&!silent){message.channel.send(msg);}
		if (nurl.host == "napchart.com") {
			// Include http(s) when specifying URLs
			getOrGenImg(nurl, message, dry);
		}
	} else if (args.length === 2 && args[1] === "none") {
		console.log("ACT   : ", "Remove napchart from database for " +author.username)
		await saveUserSchedule(message, buildUserInstance());
		msg = "Nap Chart has been removed for " + author.tag + "."
		console.log("MSG   : ", msg)
		if(!dry&&!silent){message.channel.send(msg);}
		if (args.length == 1) { return false; }
	} else {
		complete = false;
	} 
	return complete




	function buildUserInstance() {
		let userUpdate = {
			tag: author.tag,
			userName: author.username,
			updatedAt: new Date(message.createdTimestamp)
		};
		if (is_schedule) {
			userUpdate.currentScheduleName = schedfull;
		}
		if (is_nurl) {
			userUpdate.currentScheduleChart = urlPossible;
		}
		return userUpdate;
	}

	function checkIsUrlAndGet(urlPossible) {
		try {
			let nurl = new URL(urlPossible);
			if (nurl.host == "napchart.com") {
				return { is_nurl: true, nurl: nurl };
			}
		} catch (err) {
			// console.log("set image error: " + err);
			return { is_nurl: false };
		}
	}

	function checkIsSchedule(schedulePossible) {
		if (schedulePossible) {
			const schedp_arr = schedulePossible.trim().split(/-+/g);
			const schedn = schedp_arr[0].toLowerCase();
			if (schedp_arr.length == 2) {
				const schedmod = schedp_arr[1].toLowerCase();
			}
			if (
				schedp_arr.length <= 2 &&
				Object.keys(schedules).includes(schedn) &&
				(schedp_arr.length == 1 ||
					(schedp_arr.length == 2 && Object.keys(modifiers).includes(schedmod)))
			) {
				if (schedp_arr.length == 1) {
					return { is_schedule: true, schedn, schedfull: schedules[schedn].name };
				} else {
					return { is_schedule: true, schedn, schedfull: schedules[schedn].name + "-" + modifiers[schedmod].name };
				}
			} else {
				return { is_schedule: false };
			}
		}
	}

	async function saveUserSchedule(message, userUpdate) {
		let query = { id: author.id },
			options = { upsert: true, new: true, setDefaultsOnInsert: true };

		let result = null;
		try {
			result = await UserModel.findOneAndUpdate(query, userUpdate, options);
			saveHistories();
		} catch (error) {
			console.log("error seraching for User: ", error);
			if(!dry&&!silent){message.channel.send("Something done broke.  Call the fire brigade");}
			return;
		}
		return result;

		function saveHistories() {
			if (!result) {
				return;
			}
			if ('currentScheduleName' in userUpdate) {
				result.historicSchedules.push({
					name: userUpdate.currentScheduleName,
					setAt: new Date(message.createdTimestamp),
					adapted: false
				});
			}
			if ('currentScheduleChart' in userUpdate && userUpdate.currentScheduleChart != null) {
				result.historicScheduleCharts.push({
					url: userUpdate.currentScheduleChart,
					setAt: new Date(message.createdTimestamp)
				});
			}
			result.save();
		}
	}
}