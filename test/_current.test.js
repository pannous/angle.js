let {UndeclaredVariable} =require( "../exception")
let {assert_has_error, assert_equals} = require('../angle_base_tester')


exports.test_a_setter_article_vs_variable = test => {
	parse(`a=green`);
	let a = variables['a'];
	console.log(a)
	assert_equals(a, 'green');
	test.done()
}
