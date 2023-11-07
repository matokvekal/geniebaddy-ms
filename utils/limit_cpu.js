const { exec } = require('child_process');

const get_pid_from_stdout = (stdout, service_name) => {
	const splited_arr = stdout.split('?');
	for (let i = 0; i < splited_arr.length; i += 1) {
		if (i > 0 && splited_arr[i].includes(`/${service_name}`)) {
			const pid_text_arr = splited_arr[i - 1].split('\n');
			const pid = pid_text_arr[pid_text_arr.length - 1];
			return pid;
		}
	}
};

const limit_cpu_for_service = async ({ service_name, limit = 70 }) => {
	return new Promise((res, rej) => {
		exec(`ps ax | grep ${service_name}`, {}, (error, stdout, stderr) => {
			if (error || stderr) {
				return rej(error || stderr);
			}
			if (stdout) {
				const pid = get_pid_from_stdout(stdout, service_name);
				console.log(pid);
				exec(
					`cpulimit -b -p ${pid} -l ${limit}`,
					{},
					(inner_err, inner_stdout, inner_stderr) => {
						if (inner_err || inner_stderr) {
							return rej(inner_err || inner_stderr);
						}
					},
				);
				return res(true);
			} else {
				return rej('no stdout!');
			}
		});
	});
};

module.exports = { limit_cpu_for_service };
