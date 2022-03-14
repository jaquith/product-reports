WITH accounts as (
SELECT DISTINCT account_profile.account as account
FROM account_profile
), iq_stats as (
 SELECT account
 , COUNT(profile) as iq_profile_count
 , MIN(days_since_prod_publish) as days_since_prod_publish_min
 , MAX(days_since_prod_publish) as days_since_prod_publish_max
 , SUM(loader_180_days) as loader_180_days
 , SUM(visit_180_days) as visit_180_days
 , GROUP_CONCAT(DISTINCT "|" || all_consent_tools || "|") as consent_management_detected
 FROM iq_profiles
 GROUP BY 1
), cdh_stats as (
 SELECT account
 , SUM (audienceStreamEnabled) as as_profiles
 , SUM (eventStreamEnabled) as es_profiles
 FROM cdh_profiles
 GROUP BY 1
), sf_data as (
 SELECT LOWER(PrimaryTiQAccountName) as PrimaryTiQAccountName
 , CustomerStatus
 , CustomerStatusReason
 , GROUP_CONCAT(Product) as contracted_products
 , GROUP_CONCAT(ProductHealthStatus) as product_healths
 , SUM ("ARR(converted)") as arr_converted_total
 FROM salesforce_export
 GROUP BY 1
)
SELECT a.account
 , coalesce(iq.iq_profile_count, 0) as iq_profile_count
 , CASE
    WHEN iq.iq_profile_count > 0 THEN 1
    ELSE 0
END AS tiq_active
 , coalesce(sf.CustomerStatus, '') as sf_customer_status
 , iq.days_since_prod_publish_min as days_since_prod_publish_min
 , iq.days_since_prod_publish_max as days_since_prod_publish_max
 , iq.consent_management_detected
 , coalesce(sf.CustomerStatusReason, '') as sf_customer_status_reason
 , coalesce(sf.contracted_products, '') as sf_contracted_products
 , coalesce(sf.arr_converted_total, 0) as sf_arr_converted_total
FROM accounts a
LEFT JOIN iq_stats iq on a.account = iq.account
LEFT JOIN cdh_stats cdh on a.account = cdh.account
LEFT JOIN sf_data sf on a.account = sf.PrimaryTiQAccountName
WHERE (iq.iq_profile_count > 0)
ORDER BY sf.arr_converted_total DESC