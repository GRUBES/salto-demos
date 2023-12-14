/**
 * ue_emp.js
 *
 * @copyright 2023 Salto
 * @author Eric T Grubaugh <eric@stoic.software>
 * @license unlicensed
 *
 * @NApiVersion 2.1
 * @NModuleScope Public
 * @NScriptType UserEventScript
 */
define(['N/error', 'N/search'], (error, search) => {
  const errors = {
    NO_MGR_REVIEW: {
      name: 'SALTO_MGR_NOT_APPROVED',
      message: 'The Employee\'s Supervisor must sign off on this information before the record can be created.',
      notifyOff: true
    }
  }

  const beforeSubmit = context => {
    if (!hasManagerReviewed(context)) {
      throw error.create(errors.NO_MGR_REVIEW)
    }
    search.load({id: 'customsearchx_customers_in_ca'})
  }

  const hasManagerReviewed = context => {
    const isCreate = context.type === context.UserEventType.CREATE
    const hasReviewed = context.newRecord.getValue({ fieldId: 'custentity_has_mgr_reviewed' })

    return !isCreate || hasReviewed
  }

  return { beforeSubmit }
})
