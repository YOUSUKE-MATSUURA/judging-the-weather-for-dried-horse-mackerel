$(function(){
    // 都市選択時に直接検索を実行
    const groupData = {};
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

                weatherData.hourly.time.forEach((time, index) => {
                    const [dataPart, timePart] = time.split('T');
                    const day = dataPart.split('-')[2];
                    if(!groupData[day]){
                        groupData[day] = {temp: [], humidity: [], windSpeed: [], precipitationProbability: []};
                    } 
                    groupData[day].temp.push(weatherData.hourly.temperature_2m[index]);
                    groupData[day].humidity.push(weatherData.hourly.relative_humidity_2m[index]);
                    groupData[day].windSpeed.push(weatherData.hourly.wind_speed_10m[index]);
                    groupData[day].precipitationProbability.push(weatherData.hourly.precipitation_probability[index]);

                });
                console.log(groupData);
            
                $('#date-inputs').show();
            
                    Object.keys(groupData).forEach((day, index) => {
                        if (index < 7) { // 最大7日分
                            console.log(`設定中: total-result${index + 1} = ${day}日`);
                            $(`#total-result${index + 1}`)
                                .val(`${day}日`)
                                .css('cursor', 'pointer')
                                .off('click')
                                .on('click', function() {
                                    console.log(`=== ${day}日の詳細情報 ===`);
                                    console.log('気温:', groupData[day].temp);
                                    console.log('湿度:', groupData[day].humidity);
                                    console.log('風速:', groupData[day].windSpeed);
                                    console.log('降水確率:', groupData[day].precipitationProbability);

                                    for(let i = 0; i < groupData[day].temp.length; i++){
                                        const temp = groupData[day].temp[i];
                                        const humidity = groupData[day].humidity[i];
                                        const windSpeed = groupData[day].windSpeed[i];
                                        const precipitationProbability = groupData[day].precipitationProbability[i];

                                        const ajiCondition = evaluateAjiDryingConditions(parseInt(day), temp, humidity, windSpeed, precipitationProbability);

                                        $(`#result${i}`).html(`
                                            <div class="heatmap-cell" style="background: ${getBackgroundColor(ajiCondition.totalScore)};" title="スコア: ${ajiCondition.totalScore}点 - ${ajiCondition.recommendation}">
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
                                    }
                                });
                        }
                    });
            });
        });
});

    

    function evaluateAjiDryingConditions(month, temp, humidity, windSpeed, precipitationProbability){
        let totalScore = 0;

        // const isAutumnToSpring = (month >= 10 || month <= 5);
        // const mode = isAutumnToSpring ? "天日干し" : "都会干し";

        let precipScore = 0;
        if(precipitationProbability <= 20){
            precipScore = 2;
        }else if(precipitationProbability <= 30){
            precipScore = 1;
        }else{
            precipScore = 0;
        }

        let humidityScore = 0;
        if(humidity <= 60){
            humidityScore = 5;
        }else if(humidity <= 65){
            humidityScore = 3;
        }else if(humidity <= 70){
            humidityScore = 1;
        }else{
            humidityScore = 0;
        }

        let windScore = 0;
        if(windSpeed >= 2 && windSpeed <= 6){
            windScore = 4;
        }else if((windSpeed >= 1 && windSpeed < 2) || (windSpeed >= 6 && windSpeed < 8)){
            windScore = 2;
        }else{
            windScore = 0;
        }

        let tempScore = 0;
        //console.log(`デバッグ: 気温=${temp}, 型=${typeof temp}`);
        if(temp >= 5 && temp <= 20){
            tempScore = 4;
        }else if(temp > 20 && temp <= 28){
            tempScore = 2;
        }else if(temp > 28){
            tempScore = 0;
        }else{
            tempScore = 0;
        }
        //console.log(`デバッグ: 判定結果=${tempScore}点`);
        
        totalScore = precipScore + humidityScore + windScore + tempScore;

        // let recommendation = '';
        // let emoji = '';

        // if(totalScore >= 15){
        //     recommendation = `${mode}に最適です。`;
        //     emoji = '🐟';
        // }else if(totalScore >= 12){
        //     recommendation = `${mode}におすすめ`;
        //     emoji = '😊';
        // }else if(totalScore >= 8){
        //     recommendation = `${mode}に条件はまずまず`;
        //     emoji = '🤔';
        // }else if(totalScore >= 4){
        //     recommendation = `${mode}にあまり適さない。`;
        //     emoji = '😕';
        // }else{
        //     recommendation = `${mode}は避けたほうが良い`;
        //     emoji = '❌';
        // }

        return {
            //mode: mode,
            totalScore: totalScore,
            //maxScore: 18,
            //recommendation: recommendation,
            //emoji: emoji
        };
    };
});
