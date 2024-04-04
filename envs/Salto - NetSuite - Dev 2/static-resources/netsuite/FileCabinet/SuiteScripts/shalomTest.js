/**
 * @NApiVersion 2.1    
 * @NScriptType Suitelet
 */
define(['N/query', 'N/search', 'N/record', 'N/runtime', 'N/https', 'N/xml', './oauth_1', './crypto_js'],
		(query, search, record, runtime, https, xml, oauth, crypto) => {

			var PERIOD_YEAR = null;
			var ACCOUNT_TO_UPDATE = [];

			/**
			 * Defines the Suitelet script trigger point.
			 * @param {Object} scriptContext
			 * @param {ServerRequest} scriptContext.request - Incoming request
			 * @param {ServerResponse} scriptContext.response - Suitelet response
			 * @since 2015.2
			 */
			const onRequest = (scriptContext) => {
				try {
					var request = scriptContext.request;
					var params = request.parameters;
					var response = scriptContext.response;
					initAccountingPeriods();

					var recBTR = record.load({type: 'customrecord_budget_transfer_req', id: params.btrid});

					var amount = recBTR.getValue({fieldId: 'custrecord_btr_amount'});
					amount = parseFloat(amount);

					var sourceBudgetId = getSourceBudgetId(recBTR);
					var desBudgetId = getDestinationBudgetId(recBTR);

					log.debug('sourceBudgetId', sourceBudgetId);
					log.debug('desBudgetId', desBudgetId);

					var isRemoval = recBTR.getValue({fieldId: 'custrecord_btr_removal'});
					var isAddition = recBTR.getValue({fieldId: 'custrecord_btr_addition'});

					if (isRemoval) {
						if (!sourceBudgetId) {
							recBTR.setValue({fieldId: 'custrecord_btr_status', value: 'Error'});
							recBTR.setValue({fieldId: 'custrecord_btr_details_error', value: 'Budget was not found'});
						}
						else {
							var sourceBudgetResults = getBudgetDetails(sourceBudgetId);
							var sourcePeriod = recBTR.getValue({fieldId: 'custrecord_btr_source_period'});
							var sourceBudgetMonthLine = sourceBudgetResults.find(result => {
								return result.period == sourcePeriod;
							});
							log.debug('sourceBudgetMonthLine', sourceBudgetMonthLine);
							var sMonthIdx = getMonthIndex({month: getMonthFromPeriod({rec: recBTR, field: 'custrecord_btr_source_period'}), returnTrueIndex: true});
							var newSourceAmount = sourceBudgetMonthLine.amount - amount;
							if (newSourceAmount >= 0) {
								var response1 = sendSOAPRequest({budgetId: sourceBudgetId, periodIndex: sMonthIdx, amount: newSourceAmount});
							}
							else{
								recBTR.setValue({fieldId: 'custrecord_btr_status', value: 'Error'});
								recBTR.setValue({fieldId: 'custrecord_btr_details_error', value: 'Not enough amount'});

								var response1 = {
									success: false,
									errorCode: 'INVALID_AMOUNT',
									errorDetail: 'Not enough amount'
								};
							}

							updateTransferReq({response1, isAdditionOrRemoval: isRemoval, rec: recBTR});
						}
					}
					else if (isAddition) {
						if (!desBudgetId) {
							recBTR.setValue({fieldId: 'custrecord_btr_status', value: 'Error'});
							recBTR.setValue({fieldId: 'custrecord_btr_details_error', value: 'Budget was not found'});
						}
						else {
							var newDestAmount = getAmount({recBTR, amount, add: true, budgetId: desBudgetId, fieldId: 'custrecord_btr_dest_period'});
							/*var destBudgetResults = getBudgetDetails(desBudgetId);
							var destinationPeriod = recBTR.getValue({fieldId: 'custrecord_btr_dest_period'});
							var destBudgetMonthLine = destBudgetResults.find(result => {
								return result.period == destinationPeriod;
							});
							log.debug('destBudgetMonthLine', destBudgetMonthLine);
							 var newDestAmount = destBudgetMonthLine.amount + amount;*/

							var dMonthIdx = getMonthIndex({month: getMonthFromPeriod({rec: recBTR, field: 'custrecord_btr_dest_period'}), returnTrueIndex: true});
							if (newDestAmount >= 0) {
								var response1 = sendSOAPRequest({budgetId: desBudgetId, periodIndex: dMonthIdx, amount: newDestAmount});
							}
							else {
								recBTR.setValue({fieldId: 'custrecord_btr_status', value: 'Error'});
								recBTR.setValue({fieldId: 'custrecord_btr_details_error', value: 'Not enough amount'});

								var response1 = {
									success: false,
									errorCode: 'INVALID_AMOUNT',
									errorDetail: 'Not enough amount'
								};
							}

							updateTransferReq({response1, isAdditionOrRemoval: isAddition, rec: recBTR});
						}
					}
					else if (!sourceBudgetId || !desBudgetId) {
						recBTR.setValue({fieldId: 'custrecord_btr_status', value: 'Error'});
						recBTR.setValue({fieldId: 'custrecord_btr_details_error', value: 'Budget was not found'});
					}
					else if (!!sourceBudgetId && !!desBudgetId) {
						var proceed = true;
						if (!!sourceBudgetId) {
							var newSourceAmount = getAmount({recBTR, amount, add: false, budgetId: sourceBudgetId, fieldId: 'custrecord_btr_source_period'});
							/*var sourceBudgetResults = getBudgetDetails(sourceBudgetId);
							var sourcePeriod = recBTR.getValue({fieldId: 'custrecord_btr_source_period'});
							var sourceBudgetMonthLine = sourceBudgetResults.find(result => {
								return result.period == sourcePeriod;
							});
							log.debug('sourceBudgetMonthLine', sourceBudgetMonthLine);
							 var newSourceAmount = sourceBudgetMonthLine.amount - amount;*/
							var sMonthIdx = getMonthIndex({month: getMonthFromPeriod({rec: recBTR, field: 'custrecord_btr_source_period'}), returnTrueIndex: true});
							if (newSourceAmount >= 0) {
								//var response1 = sendSOAPRequest({budgetId: sourceBudgetId, periodIndex: sMonthIdx, amount: newSourceAmount});
							}
							else{
								recBTR.setValue({fieldId: 'custrecord_btr_status', value: 'Error'});
								recBTR.setValue({fieldId: 'custrecord_btr_details_error', value: 'Not enough amount'});

								var response1 = {
									success: false,
									errorCode: 'INVALID_AMOUNT',
									errorDetail: 'Not enough amount'
								};
								proceed = false;
							}
						}
						if (!!desBudgetId && proceed) {
							var newDestAmount = getAmount({recBTR, amount, add: true, budgetId: desBudgetId, fieldId: 'custrecord_btr_dest_period'});
							/*var destBudgetResults = getBudgetDetails(desBudgetId);
							var destinationPeriod = recBTR.getValue({fieldId: 'custrecord_btr_dest_period'});
							var destBudgetMonthLine = destBudgetResults.find(result => {
								return result.period == destinationPeriod;
							});
							 log.debug('destBudgetMonthLine', destBudgetMonthLine);*/
							var dMonthIdx = getMonthIndex({month: getMonthFromPeriod({rec: recBTR, field: 'custrecord_btr_dest_period'}), returnTrueIndex: true});
							//var newDestAmount = destBudgetMonthLine.amount + amount;
							if (newDestAmount >= 0) {
								//var response2 = sendSOAPRequest({budgetId: desBudgetId, periodIndex: dMonthIdx, amount: newDestAmount});
							}
							else {
								recBTR.setValue({fieldId: 'custrecord_btr_status', value: 'Error'});
								recBTR.setValue({fieldId: 'custrecord_btr_details_error', value: 'Not enough amount'});

								var response2 = {
									success: false,
									errorCode: 'INVALID_AMOUNT',
									errorDetail: 'Not enough amount'
								};

								proceed = false;
							}
						}

						if(proceed){
							var response1 = sendSOAPRequest({budgetId: sourceBudgetId, periodIndex: sMonthIdx, amount: newSourceAmount});
							var response2 = sendSOAPRequest({budgetId: desBudgetId, periodIndex: dMonthIdx, amount: newDestAmount});
						}

						updateTransferReq({response1, response2, rec: recBTR});
					}

					recBTR.save({ignoreMandatoryFields: true, enableSourcing: true});

					log.debug('ACCOUNT_TO_UPDATE', ACCOUNT_TO_UPDATE);
					ACCOUNT_TO_UPDATE.forEach(accountId => {
						updateAccountCheckboxes(accountId, false);
					});

					response.write({output: 'Budget updated'});
				}
				catch (e) {
					log.error('Error', e);
					ACCOUNT_TO_UPDATE.forEach(accountId => {
						updateAccountCheckboxes(accountId, false);
					});
					record.submitFields({
						type: 'customrecord_budget_transfer_req', id: params.btrid,
						values: {
							custrecord_btr_status: 'Error',
							custrecord_btr_details_error: e.message
						}
					});
					response.write({output: 'Error: ' + e.message});
				}
			};

			/**
			 *
			 * @param params
			 * @param params.recBTR
			 * @param params.amount
			 * @param params.fieldId
			 * @param params.budgetId
			 */
			function getAmount(params) {
				var recBTR = params.recBTR;
				var amount = params.amount;
				var fieldId = params.fieldId;
				var add = params.add || false;
				var budgetId = params.budgetId;

				log.debug('getAmount');
				log.debug('budgetId', budgetId);

				var budgetResults = getBudgetDetails(budgetId);
				var periodId = recBTR.getValue({fieldId: fieldId});

				log.debug('budgetResults', budgetResults);
				log.debug('periodId', periodId);

				var budgetMonthLine = budgetResults.find(result => {
					return result.period == periodId;
				});
				log.debug('month line', budgetMonthLine);
				var dMonthIdx = getMonthIndex({month: getMonthFromPeriod({rec: recBTR, field: fieldId}), returnTrueIndex: true});
				if (budgetMonthLine) {
					if (add) {
						var newDestAmount = budgetMonthLine ? budgetMonthLine.amount + amount : 0;
					}
					else {
						var newDestAmount = budgetMonthLine ? budgetMonthLine.amount - amount : 0;
					}
				}
				else {
					throw {name: 'Error', message: 'Budget not found'};
				}

				return newDestAmount;
			}

			/**
			 *
			 * @param params
			 * @param params.budgetId
			 * @param params.periodIndex
			 * @param params.amount
			 */
			function sendSOAPRequest(params) {
				var budgetId = params.budgetId;
				var periodIndex = params.periodIndex;
				var amount = params.amount;

				log.debug('sendSOAPRequest', params);

				var HTTP_METHOD = 'POST';
				var account = runtime.accountId;
				var endpoint = 'https://' + account.replace('_', '-').toLowerCase() + '.suitetalk.api.netsuite.com/services/NetSuitePort_2020_2';

				var token = {
					key: '82446a100751ecb025010f9a706174008cc552073846adf79c304a8af82f9edf',
					secret: '373af783771f6f11c75cb4fe445bd3aeb21de5530bf9bf19930ece32b0607e7'
				};

				var consumer = {
					key: 'abeecad12d81ba1f357ae4b60a22d1a0bdb60b81560db35936fccb1124836631',
					secret: 'dbf1055263da2ccbf45bd24f4347cb9a731d4e873922acf0181f782db1692708'
				};

				const oauth = OAuth({
					consumer: {key: consumer.key, secret: consumer.secret},
					signature_method: 'HMAC-SHA256',
					hash_function: function(base_string, key) {
						return crypto.HmacSHA256(base_string, key).toString(crypto.enc.Base64);
					}
				});

				let timestamp = new Date().getTime().toString().substring(0, 10);
				let nonce = oauth.getNonce();
				let baseString = account + '&' + consumer.key + '&' + token.key + '&' + nonce + '&' + timestamp;
				let key = consumer.secret + '&' + token.secret;
				let signature = crypto.HmacSHA256(baseString, key).toString(crypto.enc.Base64);

				var request_data = {
					url: endpoint,
					method: HTTP_METHOD,
					data: {}
				};

				var headers = {
					'Content-Type': 'text/xml',
					'SOAPAction': 'update'
				};

				var soapReq = `<soapenv:Envelope
						\t\txmlns:xsd='http://www.w3.org/2001/XMLSchema'
						\t\txmlns:xsi='http://www.w3.org/2001/XMLSchema-instance'
						\t\txmlns:soapenv='http://schemas.xmlsoap.org/soap/envelope/'
						\t\txmlns:platformCore='soapenv:core_2020_2.platform.webservices.netsuite.com'
						\t\txmlns:listEmp='urn:financial_2020_2.transactions.webservices.netsuite.com'
						\t\txmlns:platformCommon='soapenv:common_2020_2.platform.webservices.netsuite.com'
						\t\txmlns:platformMsgs='soapenv:messages_2020_2.platform.webservices.netsuite.com'>
						    <soapenv:Header>
						        <tokenPassport xsi:type='platformCore:TokenPassport'>
						            <account xsi:type='xsd:string'>${account}</account>
						            <consumerKey xsi:type='xsd:string'>${consumer.key}</consumerKey>
						            <token xsi:type='xsd:string'>${token.key}</token>
						            <nonce xsi:type='xsd:string'>${nonce}</nonce>
						            <timestamp xsi:type='xsd:long'>${timestamp}</timestamp>
						            <signature algorithm='HMAC_SHA256' xsi:type='platformCore:TokenPassportSignature'>${signature}</signature>
						        </tokenPassport>
						    </soapenv:Header>
						    <soapenv:Body>
						        <listEmp:update>
						            <listEmp:record xsi:type="listEmp:Budget" internalId="${budgetId}">
						                        <listEmp:periodAmount${periodIndex}>${amount}</listEmp:periodAmount${periodIndex}>
						            </listEmp:record>
						        </listEmp:update>
						    </soapenv:Body>
						</soapenv:Envelope>`;

				log.debug('soapReq', soapReq);
				var response = https.post({url: endpoint, headers: headers, body: soapReq});
				log.debug('response', response.body);

				var xmlDocument = xml.Parser.fromString({
					text: response.body
				});

				var statusNode = xml.XPath.select({
					node: xmlDocument,
					xpath: 'soapenv:Envelope/soapenv:Body/nlapi:updateResponse/platformMsgs:writeResponse/platformCore:status'
				});
				var errorCodeNode = xml.XPath.select({
					node: xmlDocument,
					xpath: 'soapenv:Envelope/soapenv:Body/nlapi:updateResponse/platformMsgs:writeResponse/platformCore:status/platformCore:statusDetail/platformCore:code'
				});
				var errorDetailNode = xml.XPath.select({
					node: xmlDocument,
					xpath: 'soapenv:Envelope/soapenv:Body/nlapi:updateResponse/platformMsgs:writeResponse/platformCore:status/platformCore:statusDetail/platformCore:message'
				});

				return {
					success: statusNode[0].attributes.isSuccess.value,
					errorCode: errorCodeNode[0]?.textContent || '',
					errorDetail: errorDetailNode[0]?.textContent || ''
				};
			}

			/**
			 * Run SQL Query to get budget information. Budget record is not supported by SuiteScript. Saved search
			 * does not have monthly amount columns.
			 * @param budgetId
			 * @returns {Object[]}
			 */
			function getBudgetDetails(budgetId) {
				var queryResults = query.runSuiteQL({
					query: 'Select budgets.id, budgets.account, budgets.total, budgetsMachine.period, budgetsMachine.amount from budgets INNER JOIN budgetsMachine ' +
							'ON budgetsMachine.budget = budgets.id WHERE budgets.id = ' + budgetId + ';'
				});
				return !!queryResults ? queryResults.asMappedResults() : '';
			}

			function getSourceBudgetId(recBTR) {
				try {
					var account = recBTR.getValue({fieldId: 'custrecord_btr_account'});

					/*if (!accountId) {
						return null;
					}

					var account = getAccountDetails(accountId);*/

					if (!account) {
						return null;
					}

					var dept = recBTR.getValue({fieldId: 'custrecord_btr_department'});
					var location = recBTR.getValue({fieldId: 'custrecord_btr_location'});
					var cls = recBTR.getValue({fieldId: 'custrecord_btr_class'});
					var businessUnit = recBTR.getValue({fieldId: 'custrecord_btr_business_unit'});
					var periodText = recBTR.getText({fieldId: 'custrecord_btr_source_period'});
					var fiscalYearId = getFiscalYearId({periodText});

					return searchBudgetId({account, location, dept, businessUnit, fiscalYearId, class: cls});
				}
				catch (e) {
					log.error('Error::getSourceBudgetId', e);
				}
			}

			function getAccountDetails(accountId) {
				var accountLookup = search.lookupFields({
					type: 'customrecord_mirror_account_list', id: accountId,
					columns: ['custrecord_mirror_account_id', 'custrecord_mirror_account_sum']
				});
				var actualAccountId = accountLookup.custrecord_mirror_account_id;

				if (accountLookup.custrecord_mirror_account_sum) {
					updateAccountCheckboxes(accountLookup.custrecord_mirror_account_id, true);
					ACCOUNT_TO_UPDATE.push(actualAccountId);
				}

				return actualAccountId;
			}

			function updateAccountCheckboxes(accountId, markActive) {
				log.debug('updateAccountCheckboxes ' + accountId, markActive);
				var values = {
					'issummary': true,
					'isinactive': true
				};
				if (markActive) {
					values = {
						'issummary': false,
						'isinactive': false
					};
				}
				log.debug('updateAccountCheckboxes::values', values);
				record.submitFields({
					type: record.Type.ACCOUNT, id: accountId,
					values: values
				});
			}

			function getDestinationBudgetId(recBTR) {
				try {
					var account = recBTR.getValue({fieldId: 'custrecord_btr_daccount'});

					/*if (!accountId) {
						return null;
					}

					var account = getAccountDetails(accountId);*/

					if (!account) {
						return null;
					}

					var dept = recBTR.getValue({fieldId: 'custrecord_btr_ddepartment'});
					var location = recBTR.getValue({fieldId: 'custrecord_btr_dlocation'});
					var cls = recBTR.getValue({fieldId: 'custrecord_btr_dclass'});
					var businessUnit = recBTR.getValue({fieldId: 'custrecord_btr_dbusiness_unit'});
					var periodText = recBTR.getText({fieldId: 'custrecord_btr_dest_period'});
					var fiscalYearId = getFiscalYearId({periodText});

					return searchBudgetId({account, location, dept, businessUnit, fiscalYearId, class: cls});
				}
				catch (e) {
					log.error('Error::getDestinationBudgetId', e);
				}
			}

			/**
			 *
			 * @param params
			 * @param params.rec
			 * @param params.response1
			 * @param [params.response2]
			 * @param [params.isAdditionOrRemoval]
			 */
			function updateTransferReq(params) {
				var response1 = params.response1;
				var response2 = params.response2;
				var recBTR = params.rec;

				var status = '';
				var errorDetail = '';
				if(params.isAdditionOrRemoval){
					if (response1.success == 'true') {
						status = 'Success';
						errorDetail = '';
					}
					else {
						status = 'Error';
						if(response1.success == 'false' || response1.success == false){
							errorDetail = response1.errorDetail;
						}
						else if(response2.success == 'false' || response2.success == false){
							errorDetail = response2.errorDetail;
						}
					}
				}
				else if (!!response1 && !!response2) {
					if (response1.success == 'true' && response2.success == 'true') {
						status = 'Success';
						errorDetail = '';
					}
					else {
						status = 'Error';
						if(response1.success == 'false' || response1.success == false){
							errorDetail = response1.errorDetail;
						}
						else if(response2.success == 'false' || response2.success == false){
							errorDetail = response2.errorDetail;
						}
					}
				}
				else {
					status = 'Error';
					if(response1.success == 'false' || response1.success == false){
						errorDetail = response1.errorDetail;
					}
					else if(response2.success == 'false' || response2.success == false){
						errorDetail = response2.errorDetail;
					}
				}

				log.debug('updateTransferReq::status', status);
				log.debug('updateTransferReq::errorDetail', errorDetail);

				recBTR.setValue({fieldId: 'custrecord_btr_status', value: status});
				recBTR.setValue({fieldId: 'custrecord_btr_details_error', value: errorDetail});
			}

			/**
			 *
			 * @param params
			 * @param params.account
			 * @param params.class
			 * @param params.location
			 * @param params.businessUnit
			 * @param params.fiscalYearId
			 */
			function searchBudgetId(params) {
				log.debug('searchBudgetId::params', params);
				var savedSearchId = runtime.getCurrentScript().getParameter({name: 'custscript_budget_transfer_req_search'});

				var budgetSearch = search.create({
					type: 'budgetimport',
					filters: [],
					columns: [
						'internalid',
								search.createColumn({
							name: 'account',
									sort: search.Sort.ASC
								}),
						'year',
						'subsidiary',
						'department',
						'cseg_business_unit',
						'location',
						'class',
						'accountingbook',
						'amount',
						'category',
						'currency',
						'subsidiarynohierarchy',
						'departmentnohierarchy',
						'locationnohierarchy'
							]
				});

				//var budgetSearch = search.load({id: savedSearchId});

				budgetSearch.filters.push(search.createFilter({name: 'account', operator: search.Operator.ANYOF, values: [params.account]}));
				budgetSearch.filters.push(search.createFilter({name: 'class', operator: search.Operator.ANYOF, values: [params.class]}));
				budgetSearch.filters.push(search.createFilter({name: 'department', operator: search.Operator.ANYOF, values: [params.dept]}));
				budgetSearch.filters.push(search.createFilter({name: 'location', operator: search.Operator.ANYOF, values: [params.location]}));
				budgetSearch.filters.push(search.createFilter({name: 'cseg_business_unit', operator: search.Operator.ANYOF, values: [params.businessUnit]}));
				budgetSearch.filters.push(search.createFilter({name: 'year', operator: search.Operator.ANYOF, values: [params.fiscalYearId]}));

				var results = budgetSearch.run().getRange({start: 0, end: 1000});

				return results.length > 0 ? results[0]?.id : null;
			}

			function initAccountingPeriods() {
				var queryResults = query.runSuiteQL({
					query: 'Select id, isyear, isquarter, periodname from accountingPeriod;'
				});
				var results = queryResults.asMappedResults();

				PERIOD_YEAR = results.filter(result => {
					return result.isyear == 'T';
				});

				log.debug('PERIOD_YEAR', PERIOD_YEAR);

				/*PERIOD_MONTH = results.filter(result => {
				 return result.isyear == 'F' && result.isquarter == 'F';
				 });

				 log.debug('PERIOD_MONTH', PERIOD_MONTH);*/
			}

			/**
			 *
			 * @param params
			 * @param params.periodText
			 * @returns {number Id}
			 */
			function getFiscalYearId(params) {
				if (!params.periodText) {
					return null;
				}
				var sourcePeriodSplit = params.periodText.split(' : ');

				var findResult = PERIOD_YEAR.find(year => {
					return year.periodname == sourcePeriodSplit[0];
				});

				log.debug('findResult', findResult);

				return findResult.id;

				/*var quarter = getQuarterFromSourcePeriod(params.sourcePeriodText)
				 var month = getMonthFromSourcePeriod(params.sourcePeriodText)
				 var arrMonths = getMonths();
				 var intIndx = arrMonths.indexOf(month) + parseInt(quarter[1]);
				 return parseInt(params.sourcePeriod) - (intIndx + 1);*/
			}

			/**
			 *
			 * @param params
			 * @param params.rec
			 * @param params.field
			 * @returns {*}
			 */
			function getMonthFromPeriod(params) {
				var periodText = params.rec.getText({fieldId: params.field});
				var perioSplit = periodText.split(' : ');
				var month = perioSplit[2]?.split(' ')[0];

				return month;
			}

			function getQuarterFromSourcePeriod(sourcePeriodText) {
				var sourcePeriodSplit = sourcePeriodText.split(' : ');
				var quarter = sourcePeriodSplit[1].split(' ')[0];

				return quarter;
			}

			/**
			 *
			 * @param params
			 * @param params.month
			 * @param params.returnTrueIndex
			 * @returns {*}
			 */
			function getMonthIndex(params) {
				var months = getMonths();
				var idx = months.indexOf(params.month);

				return params.returnTrueIndex ? idx + 1 : idx;
			}

			function getMonths() {
				return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

				//var month= ["January","February","March","April","May","June","July",
				// "August","September","October","November","December"];
			}

			return {onRequest};
		});
