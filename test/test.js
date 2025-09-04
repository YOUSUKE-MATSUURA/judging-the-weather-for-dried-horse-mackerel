$(function(){

    $(`body`).addClass('modal-open');

    let currentMode = `himono`;

    $(`#button-himono`).on('click', function(){
        currentMode = `himono`;
        $(`#button-himono`).addClass('active');
        $(`#button-sentaku`).removeClass('active');

        updateClockDisplay();
    });

    $(`#button-sentaku`).on('click', function(){
        currentMode = `sentaku`;
        $(`#button-himono`).removeClass('active');
        $(`#button-sentaku`).addClass('active');

        updateClockDisplay();
    });

    $(`#button-himono`).addClass('active');

    // 都市選択時に直接検索を実行
    const groupData = {};
    $('input[name="city"]').on('change', function(){
        const city = $(this).val();
        if(!city){
            return;
        }

        $('#city-modal').addClass('hidden');
        setTimeout(() => {
            $(`body`).removeClass('modal-open');
        }, 1000);

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
                setTimeout(() => {
                    $('#date-inputs').addClass('show');
                }, 200);
            
                    const sortedKeys = Object.keys(groupData).sort((a, b) => parseInt(a) - parseInt(b));
                    sortedKeys.forEach((day, index) => {
                        if (index < 7) { 
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

                                    console.log('日付がクリックされました:', day);

                                    $(`#main-container`).css({
                                        'display': 'flex',
                                        'visibility': 'visible',
                                    }).show();

                                    console.log('main-container表示設定完了');
                                    console.log('main-container要素:', $(`#main-container`).length);
                                    console.log('button-container要素:', $(`#button-container`).length);

                                    setTimeout(() => {
                                        $(`#main-container`).addClass('show');
                                    }, 100);

                                    $(`.dual-clock-container`).css('display', 'flex').show();
                                    setTimeout(() => {
                                        $(`.dual-clock-container`).addClass('show');
                                    }, 200);

                                    $('.dual-clock-container').data('current-day', day);
                                    
                                    function getBackgroundColor(score) {
                                        if (score >= 18) return '#1e40af';      
                                        if (score >= 15) return '#3b82f6';      
                                        if (score >= 12) return '#60a5fa';     
                                        if (score >= 8) return '#93c5fd';       
                                        if (score >= 4) return '#dbeafe';     
                                        return '#f1f5f9';                       
                                    }

                                    for(let i = 0; i < groupData[day].temp.length; i++){
                                        const temp = groupData[day].temp[i];
                                        const humidity = groupData[day].humidity[i];
                                        const windSpeed = groupData[day].windSpeed[i];
                                        const precipitationProbability = groupData[day].precipitationProbability[i];

                                        const ajiCondition = currentMode === `himono`
                                        ?evaluateAjiDryingConditions(parseInt(day), temp, humidity, windSpeed, precipitationProbability)
                                        : evaluateclothesDryingConditions(parseInt(day), temp, humidity, windSpeed, precipitationProbability, i);

                                        if(currentMode === 'sentaku' && (i <= 6 || i >= 20)){
                                            console.log(`時間${i}時 - 気温:${temp}℃, 湿度:${humidity}%, 風速:${windSpeed}m/s, 降水確率:${precipitationProbability}%, スコア:${ajiCondition.totalScore}`);
                                        }


                                        const hour = i;
                                        const clockHour = hour === 0 ? 12 : (hour > 12 ? hour - 12 : hour);
                                        const isAM = hour < 12;

                                        const angle = ((hour % 12) * 30) - 90;
                                        const radius = 150;
                                        const centerX = 200;
                                        const centerY = 200;

                                        const x = centerX + radius * Math.cos(angle * Math.PI / 180);
                                        const y = centerY + radius * Math.sin(angle * Math.PI / 180);

                                        $(`#result${i + 1}`).html(`
                                            <div class="hour-segment ${isAM ? 'am' : 'pm'}" style="
                                            background: ${getBackgroundColor(ajiCondition.totalScore)};
                                            left: ${x - 15}px;
                                            top: ${y - 15}px;
                                            " title="${hour}時 (${isAM ? 'AM' : 'PM'} ${clockHour}時): ${ajiCondition.totalScore}点">
                                                ${clockHour}
                                            </div>
                                        `);

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

    function evaluateclothesDryingConditions(month, temp, humidity, windSpeed, precipitationProbability, hour){
        let totalScore = 0;

        let precipScore = 0;
        if(precipitationProbability <= 10){
            precipScore = 3;
        }else if(precipitationProbability <= 20){
            precipScore = 2;
        }else if(precipitationProbability <= 30){
            precipScore = 1;
        }else{
            precipScore = 0;
        }

        let humidityScore = 0;
        if(humidity <= 50){
            humidityScore = 6;
        }else if(humidity <= 60){
            humidityScore = 4;
        }else if(humidity <= 70){
            humidityScore = 2;
        }else if(humidity <= 80){
            humidityScore = 1;
        }else{
            humidityScore = 0;
        }

        let windScore = 0;
        if(windSpeed >= 3 && windSpeed <= 8){
            windScore = 5;
        }else if(windSpeed >= 2 && windSpeed < 3){
            windScore = 3;
        }else if(windSpeed >= 1 && windSpeed < 2){
            windScore = 1;
        }else{
            windScore = 0;
        }

        let tempScore = 0;
        //console.log(`デバッグ: 気温=${temp}, 型=${typeof temp}`);
        if(temp >= 25 && temp <= 35){
            tempScore = 6;
        }else if(temp >= 20 && temp < 25){
            tempScore = 5;
        }else if(temp >= 15 && temp < 20){
            tempScore = 4;
        }else if(temp >= 10 && temp < 15){
            tempScore = 3;
        }else if(temp >= 5 && temp < 10){
            tempScore = 2;
        }else if(temp > 35 && temp <= 40){
            tempScore = 4;
        }else{
            tempScore = 0;
        }

        // 時間帯による補正（洗濯物は日中が最適）
        let timeScore = 0;
        if(hour >= 10 && hour <= 15){
            timeScore = 3; 
        }else if((hour >= 8 && hour < 10) || (hour > 15 && hour <= 17)){
            timeScore = 2;
        }else if((hour >= 6 && hour < 8) || (hour > 17 && hour <= 19)){
            timeScore = 1;
        }else{
            timeScore = 0; 
        }
        //console.log(`デバッグ: 判定結果=${tempScore}点`);
        
        totalScore = precipScore + humidityScore + windScore + tempScore + timeScore;

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

    function updateClockDisplay(){
        const currentDay = $('.dual-clock-container').data('current-day');
        if(currentDay && groupData[currentDay]){

            function getBackgroundColor(score) {
                if (score >= 18) return '#1e40af';      
                if (score >= 15) return '#3b82f6';      
                if (score >= 12) return '#60a5fa';      
                if (score >= 8) return '#93c5fd';       
                if (score >= 4) return '#dbeafe';       
                return '#f1f5f9';               
            }        

            for(let i = 0; i < groupData[currentDay].temp.length; i++){
                const temp = groupData[currentDay].temp[i];
                const humidity = groupData[currentDay].humidity[i];
                const windSpeed = groupData[currentDay].windSpeed[i];
                const precipitationProbability = groupData[currentDay].precipitationProbability[i];

                const ajiCondition = currentMode === 'himono'
                 ? evaluateAjiDryingConditions(parseInt(currentDay), temp, humidity, windSpeed, precipitationProbability) 
                 : evaluateclothesDryingConditions(parseInt(currentDay), temp, humidity, windSpeed, precipitationProbability, i);

                const hour = i;
                const clockHour = hour === 0 ? 12 : (hour > 12 ? hour - 12 : hour);
               
                $(`#result${i + 1} .hour-segment`).css('background', getBackgroundColor(ajiCondition.totalScore));
            }
        }
    }
});
