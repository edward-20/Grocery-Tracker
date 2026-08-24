# Uses of the App

1. Customer uses the app to
   `(product, location, acceptable_travel_distance) -> [prices of the product at nearby locations]`
2. Australians use the page to
   `product -> price history chart`

# Resources

[Javascript product data scrapper for Coles, Woolies and IGA](https://github.com/nguyentansinh123/Scraping-Coles-Woolworths-IGA)

[Claims there's an underlying api](https://www.youtube.com/watch?v=d6Xy1vTRSGk&list=PLuw-7IgAPeNA2rmCCrcusNS-o_ScDT6oB)
[Quote from Wilt](https://www.reddit.com/r/coles/comments/1ijor8g/cant_request_access_for_coles_food_api/)
"The endpoints of each stores APIs are avaliable behind some data scraping protection and not documented but my videos (and purchasble code) fix that issue " Seems untrue. And also, the videos are titled, web scraping thus probably not an API.

[A list of price comparison tools on OzBargain](https://www.ozbargain.com.au/wiki/list_of_price_comparison_sites#groceries)

[A website that died](https://www.reddit.com/r/melbourne/comments/1awxvw1/coles_and_woolies_price_comparison/)

## Price Check Guy

[Reddit Thread](https://www.reddit.com/r/perth/comments/1g4aatt/i_made_a_program_that_gets_historical_prices_from/)
[Reddit Thread also by Turbulent Goat](https://www.reddit.com/r/perth/comments/1kqawjo/made_a_mobile_app_which_predicts_when_coles/)

[PriceCheckGuy's LinkTree, his whole business is price checking](https://linktr.ee/PriceCheckGuy)
[The Firefox extension made by Data Holdings Group aka PriceCheckGuy for Coles. He has Woolworths and Coles price checking extensions for both Firefox and Chrome.](https://addons.mozilla.org/en-GB/firefox/addon/coles-trend/)
[Coles Product Price API made by Data Holdings Group (paid)](https://rapidapi.com/data-holdings-group-data-holdings-group-default/api/coles-product-price-api)

# Coles

## Roughly speaking, the webscraping protocol

Assuming you've created an account (the only way to be allowed to use click n collect).

1. Click on When pill
2. Click tomorrow (stable) or click today (you'll have a limited time slot)
3. Click 7am to 8am
4. Click confirm button

5. Click on Click n Collect pill
6. Click the Change link
7. Enter `<Suburb>, <State> <Postcode>`

Loop 8. For each radio select, perform the following steps 9. Click the radio button 10. Click the set location button 11. Search for the product

Note: signing up for an account could bind you to legal agreements such as not web-scraping.

# Reading

[News Article about a Grocery Price Tracker in Austria](https://archive.md/XSsxR)
[The website itself](https://heisse-preise.io/?f=-;-;.;.;-;-;-;-;-;-;-;-;.;-;100;0;-;2026-02-03;.;.;.;banana&l=-;.;price-asc;-&c=2026-02-03;-;-;2017-01-01;-;-&d=)

[ACCC Investigation](https://www.accc.gov.au/media-release/accc-takes-woolworths-and-coles-to-court-over-alleged-misleading-prices-dropped-and-down-down-claims)
