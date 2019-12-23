export const definitions = {
    typeConfiguration: {
        "limit": {
            "value": {
                "description": "the amount",
                "type": "number",
                "required": true
            },                        
            "restrictedChange": {
                "description": "defines how this limit is changeable when it is currently locked",
                "type": "select",
                "value": "Increment|Decrement|Both"
            },
            "disableWhenValue0": {
                "description": "when true then a value 0 means an infinite limit",
                "type": "boolean"
                
            },
            "restrictAccountWhenExceeds": {
                "description": "when this slimit exceeds the account should be restricted",
                "type": "multiselect",
                "value": "withdrawal|betplacing|deposit"
            }
        },
        "periodicLimit": {
            "amount": {
                "type": "number",
                "required": true
            },
            "period": {
                "type": "period",
                "required": true
            },
            "turnoverData": {
                "type": "select",
                "value": "turnovers" // provides a list of imlemented turnofers "sum_stake_live"                
            }
        }
    },
    filters: [
        {
            name: "UserBrand",
            values: [
                { id: 1, name: 'Cashpoint'},
                { id: 2, name: 'XTip'},
                { id: 7, name: 'Betcenter'},
                { id: 11, name: 'Sportwetten'},
            ]
        },
        {
            name: "UserCountry",
            values: [
                { id: 14, name: 'Austria'},
                { id: 82, name: 'Germany'},
            ]
        },
        {
            name: "UserLicense",
            values: [
                { id: 1, name: 'Malta'},
                { id: 2, name: 'Germany Schleswig holstein'},
                { id: 3, name: 'Denmark'},
            ]
        },
        {
            name: "PaymentData",
            description: "checks if a user has required payment data",
            values: [
                { id: 1, name: 'Skrill'},
                { id: 2, name: 'Paypal'},
                { id: 3, name: 'Bank'},
            ]
        },                 
        {
            name: "IsTemporaryAccount",
            values: [
                { id: 0, name: 'False'},
                { id: 1, name: 'True'},
            ]
        },
        {
            name: "SettingValue",
            values: [
                { id: 0, name: 'False'},
                { id: 1, name: 'True'},
            ]
        }                     
    ],
    roles: [
        {
            name: "user"
        }
    ],
    groups: [
        {
            name: "limits",
            propertiesTypes: ["selflimits", "systemlimits"],
            children: [
                {
                    name: "display",
                    inheritFromParent: true
                }
            ]
        },
        {
            name: "common"
        }
    ],
    rules: [
        {
            name: "UnverifiedAccount",
            inheritFromParent: true,
            query: {
                condition: 'and',
                rules: [
                  {field: 'UserBrand', operator: '<=', value: 'Bob'},
                  {field: 'IdChecked', operator: '=', value: '1'}
                ]
              },        
            groups: [{
                name: "root",
                properties: [],
                children: [
                    {
                        name: "display",
                        properties: [1,2,37],
                        inheritFromParent: false
                    }
                ]
            }]

        },
        {
            name: "Betcenter",
            inheritFromParent: true,
            query: {
                condition: 'and',
                rules: [
                  {field: 'UserBrand', operator: '=', value: 7},
                  {field: 'UserCountry', operator: '=', value: 14}
                ]
              },   
            groups: [
                {
                    name: "limits",
                    properties: [1,2,3],
                    children: [
                        {
                            name: "display",
                            properties: [1,2,3],
                            inheritFromParent: false
                        }
                    ]
                },
                {
                    name: "common",
                    properties: [1,2,3],
                    children: [
                        {
                            name: "display",
                            properties: [1,2,3]
                        }
                    ]
                }
            ],
            children: [
                {
                    name: "SH",
                    query: {
                        condition: 'and',
                        rules: [
                          {field: 'UserLicense', operator: '=', value: 2}
                        ]
                      },  
                    groups: [

                    ],
                    inheritFromParent: true,
                    children: [
                        {
                            name: "temporaryAccoount",
                            groups: [
                        
                            ],                            
                            query: {
                                condition: 'and',
                                rules: [
                                  {field: 'IsTemporaryAccount', operator: '=', value: true}
                                ]
                              },  
                            inheritFromParent: true
                        }
                    ]
                }
            ]
        },
        {
            name: "XTip",
            inheritFromParent: true,
            query: {
                condition: 'and',
                rules: [
                  {field: 'UserBrand', operator: '=', value: 2},
                  {field: 'UserCountry', operator: '=', value: 84}
                ]
              },  
            groups: [
                {
                    name: "limits",
                    properties: [1,2,6],
                    children: [
                        {
                            name: "display",
                            properties: [1,2,3],
                            inheritFromParent: false
                        }
                    ]
                },
                {
                    name: "common",
                    properties: [1,2,3],
                    children: [
                        {
                            name: "display",
                            properties: [1,2,3]
                        }
                    ]
                }
            ]
        },
        {
            name: "Totolotek",
            inheritFromParent: true,
            query: {
                condition: 'and',
                rules: [
                  {field: 'UserBrand', operator: '=', value: 12}
                ]
              },  
            groups: [
                {
                    name: "limits",
                    properties: [1,2,6],
                    children: [
                        {
                            name: "display",
                            properties: [1,2,3],
                            inheritFromParent: false
                        }
                    ]
                }
            ],
            children: [
                {
                    name: "temporaryAccoount",
                    groups: [
                        {
                            name: "limtis",
                            properties: [1,2,6]
                        }
                    ],                            
                    query: {
                        condition: 'and',
                        rules: [
                          {field: 'PaymentData', operator: '=', value: 3}
                        ]
                      },  
                    inheritFromParent: true
                }
            ]
        }        
    ]
}