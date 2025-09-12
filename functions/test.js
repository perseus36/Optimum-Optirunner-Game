// functions/test.js - Simple Test Function
exports.handler = async (event, context) => {
    return {
        statusCode: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            success: true,
            message: 'Test function working!',
            timestamp: new Date().toISOString()
        })
    };
};
