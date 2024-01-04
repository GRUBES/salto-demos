<#global countryGroup1 = ["Ireland","United Kingdom"]>
<#global dfGroup1 = "dd/MM/YYYY">
<#global countryGroup2 = ["Canada"]>
<#global dfGroup2 = "YYYY/MM/dd">
<#global countryGroup3 = ["United States"]>
<#global dfGroup3 = "MM/dd/YYYY">

<#function computeTaxTotalCombinations taxDetails subPref>
<#assign totalTaxObj =[]>
  <#assign taxLabel = ''>
  <#assign taxLabel2 = ''>
  <#assign taxTotal = record.taxtotal>
  <#assign taxTotal2 = record.tax2total>
<#if (subPref.taxLabel)?has_content>
  <#assign taxLabel = (subPref.taxLabel)>
  </#if>
<#if (subPref.taxLabel2)?has_content>
  <#assign taxLabel2 = (subPref.taxLabel2)>
  </#if>
<#if (countryGroup1?seq_index_of(record.subsidiary.country) != -1) >
<#assign shippingRateSameAsLine = false>
  <#assign shippingTaxRate = 0>
<#if (record.shippingtax1rate)?has_content>
  <#assign shippingTaxRate = (record.shippingtax1rate)?eval>
  </#if>
  <#assign seen_taxrate = []>
  <#list taxDetails?sort_by("taxrate1") as taxLine>
<#if (taxLine.taxrate1 != 0) && (!(seen_taxrate?seq_contains(taxLine.taxrate1)))>
<#assign seen_taxrate = seen_taxrate + [taxLine.taxrate1]>
  <#assign tax_total = 0>
  <#list taxDetails as taxDetail>
<#if taxLine.taxrate1 == taxDetail.taxrate1>
<#assign tax_total = tax_total + taxDetail.taxamt1>
  </#if>
</#list>
<#if (shippingTaxRate != 0) && (taxLine.taxrate1?replace('%','')?eval == shippingTaxRate)>
<#assign tax_total = tax_total + (record.shippingcost * shippingTaxRate) / 100>
  <#assign shippingRateSameAsLine = true>
  </#if>
<#assign totalTaxObj = totalTaxObj + [{"taxLabel":taxLabel,"taxPercent":taxLine.taxrate1,"totalTaxAmount":tax_total}]>
  </#if>
</#list>
<#if (shippingTaxRate != 0) && shippingRateSameAsLine == false>
<#assign totalTaxObj = totalTaxObj + [{"taxLabel":taxLabel,"taxPercent":shippingTaxRate +"%","totalTaxAmount":(record.shippingcost * shippingTaxRate) / 100}]>
  </#if>
<#elseif (countryGroup2?seq_index_of(record.subsidiary.country) != -1)  >
<#assign taxRateGst1 = record.shippingtax1rate>
  <#assign taxRatePst1 = record.shippingtax2rate>
  <#list taxDetails as taxLine>
<#if (taxTotal != 0 || taxTotal2 != 0) && (taxLine.taxrate1 != 0 || taxLine.taxrate2 != 0)>
<#assign taxRateGst1 = taxLine.taxrate1>
  <#assign taxRatePst1 = taxLine.taxrate2>
  <#break>
  </#if>
</#list>
<#if taxTotal != 0>
  <#assign totalTaxObj = totalTaxObj + [{"taxLabel":taxLabel,"taxPercent":taxRateGst1,"totalTaxAmount":taxTotal}]>
  </#if>
<#if taxTotal2 != 0>
  <#assign totalTaxObj = totalTaxObj + [{"taxLabel":taxLabel2,"taxPercent":taxRatePst1,"totalTaxAmount":taxTotal2}]>
  </#if>
<#elseif (countryGroup3?seq_index_of(record.subsidiary.country) != -1)>
<#if record.subtotal != 0>
<#assign totalTaxObj = [{"taxLabel":record.taxtotal@label,"taxPercent":(record.taxtotal / record.subtotal * 100)?string("#.##") +"%","totalTaxAmount":taxTotal}]>
</#if>
</#if>
<#if totalTaxObj?has_content>
  <#return totalTaxObj>
  <#else>
  <#return []>
  </#if>
  </#function>

<#function formatHeaderDate>
  <#if countryGroup1?seq_contains(record.subsidiary.country)>
    <#assign dateObject = {"tranDate": record.trandate?string(dfGroup1)}>
    <#if record.duedate?has_content>
      <#assign dueDateValue = record.duedate?string(dfGroup1)>
    <#else>
      <#assign dueDateValue = "">
    </#if>
    <#assign dateObject = dateObject + {"dueDate": dueDateValue}>
  <#elseif countryGroup2?seq_contains(record.subsidiary.country)>
    <#assign dateObject = {"tranDate": record.trandate?string(dfGroup2)}>
    <#if record.duedate?has_content>
      <#assign dueDateValue = record.duedate?string(dfGroup2)>
    <#else>
      <#assign dueDateValue = "">
    </#if>
    <#assign dateObject = dateObject + {"dueDate": dueDateValue}>
  <#elseif countryGroup3?seq_contains(record.subsidiary.country)>
    <#assign dateObject = {"tranDate": record.trandate?string(dfGroup3)}>
    <#if record.duedate?has_content>
      <#assign dueDateValue = record.duedate?string(dfGroup3)>
    <#else>
      <#assign dueDateValue = "">
    </#if>
    <#assign dateObject = dateObject + {"dueDate": dueDateValue}>
  <#else>
    <#assign dateObject = {"tranDate": record.trandate, "dueDate": record.duedate}>
  </#if>
  <#if dateObject?has_content>
    <#return dateObject>
  </#if>
</#function>

<#function formatLineDate item>
  <#assign dateObject = {}>
  <#if countryGroup1?seq_contains(record.subsidiary.country)>
    <#assign dateObject = {"serviceStartDate": item.custcol_dyn_strt_date?string(dfGroup1), "serviceEndDate": item.custcol_dyn_end_date?string(dfGroup1)}>
  <#elseif countryGroup2?seq_contains(record.subsidiary.country)>
    <#assign dateObject = {"serviceStartDate": item.custcol_dyn_strt_date?string(dfGroup2), "serviceEndDate": item.custcol_dyn_end_date?string(dfGroup2)}>
  <#elseif countryGroup3?seq_contains(record.subsidiary.country)>
    <#assign dateObject = {"serviceStartDate": item.custcol_dyn_strt_date?string(dfGroup3), "serviceEndDate": item.custcol_dyn_end_date?string(dfGroup3)}>
  <#else>
    <#assign dateObject = {"serviceStartDate": item.custcol_dyn_strt_date, "serviceEndDate": item.custcol_dyn_end_date}>
  </#if>
  <#if dateObject?has_content>
    <#return dateObject>
  </#if>
</#function>