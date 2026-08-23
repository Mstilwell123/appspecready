# DNS Configuration for appspecready.ai → Netlify
#
# These records must be set at your domain registrar (where you own appspecready.ai)
# Replace NETLIFY_SITE_ID with the actual site ID from your Netlify dashboard
#
# CNAME Record:
# Host: appspecready
# Type: CNAME
# Value: appspecready.netlify.app
# TTL: 3600 (1 hour)
#
# Alternative (if registrar requires):
# Netlify DNS servers can be set as nameservers:
#   dns1.netlify.com
#   dns2.netlify.com
#   dns3.netlify.com
#   dns4.netlify.com
#
# After setting DNS, Netlify will provision an SSL cert automatically within 24 hours
