/**
 * @NApiVersion 2.1
 * @NScriptType restlet
 */
define(["N/record", "N/query", "N/search"], (record, query, search) => {
  const getRecordFields = (rec) => {
    const result = { body: {}, sublists: [] };
    const { id, sublists = [], type, fields = [], filter } = rec;

    const recObj = record.load({ type, id });

    if (filter != null) {
      const filterValue = recObj.getValue({ fieldId: filter.fieldId });
      if (!filter.in.includes(filterValue)) {
        return undefined;
      }
    }

    const allFields = recObj.getFields();
    const fieldsToIterate = fields.filter(f => allFields.includes(f));

    if (fields.length !== fieldsToIterate.length) {
      result.allFields = allFields;
    }

    for (let bodyField of fieldsToIterate) {
      result.body[bodyField] = recObj.getValue({ fieldId: bodyField });
    }
  
    for (let sublist of sublists) {
      for (let i = 0; i < recObj.getLineCount({ sublistId: sublist.sublistId }); i++) {
        const sublistRecId = recObj.getSublistValue({
          sublistId: sublist.sublistId,
          line: i,
          fieldId: sublist.idAlias,
        });
        const isDynamicType = recObj.getSublistValue({
          sublistId: sublist.sublistId,
          line: i,
          fieldId: sublist.type,
        });
        const type = !!isDynamicType ? `${isDynamicType.toLowerCase()}${sublist.typeSuffix}` : sublist.type;
        const inner = getRecordFields({ ...sublist, id: sublistRecId, type });
        if (inner != null) {
          result.sublists.push(inner);
        }
      }
    }

    return result;
  };

  return {
    post: (data) => JSON.stringify(getRecordFields(data)),
  };
});
