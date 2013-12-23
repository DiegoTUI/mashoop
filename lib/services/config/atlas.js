'use strict';
/*
 * Atlas requests and description maps.
 *
 * Copyright (C) 2013 TuiInnovation.
 */

// ATLAS base url
exports.url = 'http://212.170.239.18/appservices/http/FrontendService';
// ticketAvail request
exports.ticketAvailRequest = 
'{ \
    "TicketAvailRQ": { \
      "@echoToken": "$echoToken$", \
      "@sessionId": "$sessionId$", \
      "@xmlns": "$xmlns$", \
      "@xmlns:xsi": "$xmlns:xsi$", \
      "@xsi:schemaLocation": "$xsi:schemaLocation$", \
      "Language": "$language$", \
      "Credentials": { \
        "User": "$user$", \
        "Password": "$password$" \
      }, \
      "PaginationData": { \
        "@itemsPerPage": "$pageSize$", \
        "@pageNumber": "$page$" \
      }, \
      "ServiceOccupancy": { \
        "AdultCount": "$adults$", \
        "ChildCount": "$children$" \
      }, \
      "Destination": { \
        "@code": "$destination$", \
        "@type": "$destinationType$" \
      }, \
      "DateFrom": { \
        "@date":"$from$" \
      }, \
      "DateTo": { \
        "@date":"$to$" \
      } \
  } \
}';
// ticketAvail request
exports.ticketValuationRequest = 
'{ \
    "TicketValuationRQ": { \
      "@echoToken": "$echoToken$", \
      "@xmlns": "$xmlns$", \
      "@xmlns:xsi": "$xmlns:xsi$", \
      "@xsi:schemaLocation": "$xsi:schemaLocation$", \
      "Language": "$language$", \
      "Credentials": { \
        "User": "$user$", \
        "Password": "$password$" \
      }, \
      "AvailToken": "$availToken$", \
      "ServiceOccupancy": { \
        "AdultCount": "$adults$", \
        "ChildCount": "$children$" \
      }, \
      "DateFrom": { \
        "@date":"$from$" \
      }, \
      "DateTo": { \
        "@date":"$to$" \
      }, \
      "ModalityCode": "$modality$", \
      "TicketCode": "$ticket$" \
  } \
}';
// hotelList request
exports.hotelListRequest = 
'{ \
    "HotelListRQ": { \
      "@echoToken": "$echoToken$", \
      "@xmlns": "$xmlns$", \
      "@xmlns:xsi": "$xmlns:xsi$", \
      "@xsi:schemaLocation": "$xsi:schemaLocation$", \
      "Language": "$language$", \
      "Credentials": { \
        "User": "$user$", \
        "Password": "$password$" \
      }, \
      "Destination": { \
        "@code": "$destination$", \
        "@type": "$destinationType$" \
      } \
  } \
}';
// hotelDetail request
exports.hotelDetailRequest = 
'{ \
    "HotelDetailRQ": { \
      "@echoToken": "$echoToken$", \
      "@xmlns": "$xmlns$", \
      "@xmlns:xsi": "$xmlns:xsi$", \
      "@xsi:schemaLocation": "$xsi:schemaLocation$", \
      "Language": "$language$", \
      "Credentials": { \
        "User": "$user$", \
        "Password": "$password$" \
      }, \
      "HotelCode": "$hotel$" \
  } \
}';