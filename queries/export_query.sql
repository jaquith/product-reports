SELECT account
				 , profile
				 , (account || '/' || profile) AS account_and_profile
				 , prod_version
				 , privacy_manager
				 , ccpa
				 , ccpa_load_rule
				 , consent_prompt
				 , consent_preferences
				 , consent_manager_load_rule
				 , consent_logging
				 , cmp_extension
				 , CASE
						WHEN cmp_consentmanagernet = 1
						   THEN 'consentmanagernet'
						 WHEN cmp_cookiebot = 1
						   THEN 'cookiebot'
						WHEN cmp_didomi = 1
						   THEN 'didomi'
						WHEN cmp_evidon = 1
						   THEN 'evidon'
						WHEN cmp_iubenda = 1
						   THEN 'iubenda'
						WHEN cmp_liveramp = 1
						   THEN 'liveramp'
						WHEN cmp_osano = 1
						   THEN 'osano'
						WHEN cmp_quantcast = 1
						   THEN 'quantcast'
						WHEN cmp_sourcepoint = 1
						   THEN 'sourcepoint'
						WHEN cmp_trustarc = 1
						   THEN 'trustarc'
						WHEN cmp_usercentrics = 1
						   THEN 'usercentrics'
						 WHEN cmp_onetrust = 1 /* onetrust has false positives for some reason with cookiebot, evidon and osano, so it needs to be last on the list */
						   THEN 'onetrust'
						   ELSE 0
				   END AS other_cmp
			     , (cmp_consentmanagernet + cmp_cookiebot + cmp_didomi + cmp_evidon + cmp_iubenda + cmp_liveramp + cmp_onetrust + cmp_osano + cmp_quantcast + cmp_sourcepoint + cmp_trustarc + cmp_usercentrics) AS cmp_count
				 , CASE
							WHEN mobile_publishing = 1 AND (mobile_to_loader_ratio_past_month > 1 OR mobile_to_loader_ratio_past_six_months >1)
							   THEN 1
							   ELSE 0
					   END AS likely_mobile_profile
				 , mobile_publishing
				 , visits_past_six_months
				 , loader_past_six_months
				 , mobile_past_six_months
				 , visits_past_month
				 , loader_past_month
				 , mobile_past_month

FROM log

WHERE 
  /* only export production-level traffic (this is a pretty low bar for that) */
  ((loader_past_month > 1000 AND loader_past_six_months > 6000) OR (mobile_past_month > 1000 AND mobile_past_six_months > 6000))