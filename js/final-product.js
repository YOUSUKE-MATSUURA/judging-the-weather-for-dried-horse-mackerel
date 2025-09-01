$(function(){
    // 都市選択時に直接検索を実行
    $('input[name="city"]').on('change', function(){
        const city = $(this).val();
        if(!city){
            return;
        }

        // 1. 都市名から緯度経度を取得 (Open-MeteoのジオコーディングAPI)
        const geocodeUrl = "https://geocoding-api.open-meteo.com/v1/search?name=" + encodeURIComponent(city) + "&count=1&language=ja&format=json";

        $.getJSON(geocodeUrl, function(data){
            console.log(data);
            if(!data.results || data.results.length === 0){
                $('#result').text('都市名が見つかりませんでした。');
                return;
            }
            
            const name = data.results[0].name;
            const lat = data.results[0].latitude;
            const lon = data.results[0].longitude;

            console.log(lat, lon);

            // 2. 緯度経度から天気を取得 (Open-MeteoのAPI)
            const weatherUrl = "https://api.open-meteo.com/v1/forecast?latitude=" + lat + "&longitude=" + lon + 
                "&hourly=temperature_2m,relative_humidity_2m,wind_speed_10m,precipitation_probability&timezone=Asia/Tokyo";

            $.getJSON(weatherUrl, function(weatherData){
                console.log(weatherData.hourly.temperature_2m);
                if(weatherData.hourly.time){
                    $('#result').html(name + 'の天気<br>');
                    for(let n = 0; n < weatherData.hourly.time.length; n++){
                        const time = weatherData.hourly.time[n];
                        const temp = weatherData.hourly.temperature_2m[n];
                        const humidity = weatherData.hourly.relative_humidity_2m[n];
                        const windSpeed = weatherData.hourly.wind_speed_10m[n];
                        const precipitationProbability = weatherData.hourly.precipitation_probability[n];

                        const [dataPart, timePart] = time.split('T');
                        const [year, month, day] = dataPart.split('-');
                        const hour = timePart.split(':');

                        const ajiCondition = evaluateAjiDryingConditions(parseInt(month), temp, humidity, windSpeed, precipitationProbability);

                        
                        $(`#result${n}`).html(`
                            <div class="heatmap-cell" style="background: ${getBackgroundColor(ajiCondition.totalScore)};" title="${hour[0]}時: ${ajiCondition.totalScore}点 - ${ajiCondition.recommendation}">
                                ${hour[0]}時<br>
                                ${ajiCondition.totalScore}点
                            </div>
                        `);

                        function getBackgroundColor(score) {
                            if (score >= 15) return '#1e3a8a';      
                            if (score >= 12) return '#3b82f6';      
                            if (score >= 8) return '#60a5fa';       
                            if (score >= 4) return '#93c5fd';       
                            return '#dbeafe';                       
                        }

                    };
                } else {
                    $('#result').text('天気情報の取得に失敗しました。');
                }
            });
        });
    });

    $('input[name="total-result"]').on('change', function(){



    });

    function evaluateAjiDryingConditions(month, temp, humidity, windSpeed, precipitationProbability){
        let totalScore = 0;
        let details = [];

        const isAutumnToSpring = (month >= 10 || month <= 5);
        const mode = isAutumnToSpring ? "天日干し" : "都会干し";

        let precipScore = 0;
        if(precipitationProbability <= 20){
            precipScore = 2;
            details.push(`降水確率◎(2点)`);
        }else if(precipitationProbability <= 30){
            precipScore = 1;
            details.push(`降水確率△(1点)`);
        }else{
            precipScore = 0;
            details.push(`降水確率×(0点)`);
        }

        let humidityScore = 0;
        if(humidity <= 60){
            humidityScore = 5;
            details.push(`湿度◎(5点)`);
        }else if(humidity <= 65){
            humidityScore = 3;
            details.push(`湿度○(3点)`);
        }else if(humidity <= 70){
            humidityScore = 1;
            details.push(`湿度△(1点)`);
        }else{
            humidityScore = 0;
            details.push(`湿度×(0点)`);
        }

        let windScore = 0;
        if(windSpeed >= 2 && windSpeed <= 6){
            windScore = 4;
            details.push(`風速◎(4点)`);
        }else if((windSpeed >= 1 && windSpeed < 2) || (windSpeed >= 6 && windSpeed < 8)){
            windScore = 2;
            details.push(`風速△(2点)`);
        }else{
            windScore = 0;
            details.push(`風速×(0点)`);
        }

        let tempScore = 0;
        console.log(`デバッグ: 気温=${temp}, 型=${typeof temp}`);
        if(temp >= 5 && temp <= 20){
            tempScore = 4;
            details.push(`気温◎(4点)`);
        }else if(temp > 20 && temp <= 28){
            tempScore = 2;
            details.push(`気温○/△(2点)`);
        }else if(temp > 28){
            tempScore = 0;
            details.push(`気温×(0点)`);
        }else{
            tempScore = 0;
            details.push(`気温×(0点)`);
        }
        console.log(`デバッグ: 判定結果=${tempScore}点`);
        
        totalScore = precipScore + humidityScore + windScore + tempScore;

        let recommendation = '';
        let emoji = '';

        if(totalScore >= 15){
            recommendation = `${mode}に最適です。`;
            emoji = '🐟';
        }else if(totalScore >= 12){
            recommendation = `${mode}におすすめ`;
            emoji = '😊';
        }else if(totalScore >= 8){
            recommendation = `${mode}に条件はまずまず`;
            emoji = '🤔';
        }else if(totalScore >= 4){
            recommendation = `${mode}にあまり適さない。`;
            emoji = '😕';
        }else{
            recommendation = `${mode}は避けたほうが良い`;
            emoji = '❌';
        }

        return {
            mode: mode,
            totalScore: totalScore,
            maxScore: 18,
            recommendation: recommendation,
            emoji: emoji,
            details: details
        };
    };
});
