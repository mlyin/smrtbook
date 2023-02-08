package edu.upenn.cis.nets2120.hw3.livy;

import java.io.BufferedWriter;
import java.io.File;
import java.io.FileWriter;
import java.io.IOException;
import java.net.URI;
import java.net.URISyntaxException;
import java.util.List;
import java.util.concurrent.ExecutionException;
import java.util.Map;
import java.util.Set;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.time.LocalDate;

import java.lang.InterruptedException;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

import com.amazonaws.auth.AWSCredentials;
import com.amazonaws.auth.AWSStaticCredentialsProvider;
import com.amazonaws.auth.BasicAWSCredentials;
import com.amazonaws.regions.Regions;
import com.amazonaws.services.dynamodbv2.AmazonDynamoDB;
import com.amazonaws.services.dynamodbv2.AmazonDynamoDBClientBuilder;
import com.amazonaws.services.dynamodbv2.document.DynamoDB;
import com.amazonaws.services.dynamodbv2.document.Item;
import com.amazonaws.services.dynamodbv2.document.Table;
import com.amazonaws.services.dynamodbv2.document.spec.UpdateItemSpec;
import com.amazonaws.services.dynamodbv2.document.utils.ValueMap;
import com.amazonaws.services.dynamodbv2.model.AttributeValue;
import com.amazonaws.services.dynamodbv2.model.ScanRequest;
import com.amazonaws.services.dynamodbv2.model.ScanResult;
import com.amazonaws.services.s3.AmazonS3;
import com.amazonaws.services.s3.AmazonS3ClientBuilder;
import com.amazonaws.services.s3.model.ObjectMetadata;
import com.amazonaws.services.s3.model.PutObjectRequest;

import org.apache.livy.LivyClient;
import org.apache.livy.LivyClientBuilder;

import edu.upenn.cis.nets2120.config.Config;

//it's probably best to return something that directly has users mapped to articles and normalized,
//then here that can all get uploaded into a table indexed by the username probably, and then the 
//recommender can just start doing its thing

public class ComputeRanksLivy {

    static AmazonDynamoDB client = AmazonDynamoDBClientBuilder.standard().withRegion(Regions.US_EAST_1).build();
    static DynamoDB dynamoDB = new DynamoDB(client);

    static Table outputTable = dynamoDB.getTable("userArticleWeights");
    static Table userTable = dynamoDB.getTable("users");

    static String accessKey = "AKIAXK7SOWYGJXBES3CK";
    static String secretKey = "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";

    static AWSCredentials credentials = new BasicAWSCredentials(accessKey, secretKey);
    static AmazonS3 s3Client = AmazonS3ClientBuilder.standard()
            .withCredentials(new AWSStaticCredentialsProvider(credentials))
            .withRegion(Regions.US_EAST_1)
            .build();

    static LocalDate date;
    static Set<String> today;

    private static void makeFiles() {

        date = LocalDate.now();
        //System.out.println(date.getMonthValue());
        //System.out.println(date.getDayOfMonth());
        //System.exit(0);
        today = new HashSet<>();

        try {
            ScanRequest scanRequest = new ScanRequest()
                    .withTableName("users");

            BufferedWriter friendWriter = new BufferedWriter(new FileWriter("friends"));
            BufferedWriter interestsWriter = new BufferedWriter(new FileWriter("interests"));
            BufferedWriter userLikesArticleWriter = new BufferedWriter(new FileWriter("userlikesarticle"));

            ScanResult result = client.scan(scanRequest);
            for (Map<String, AttributeValue> item : result.getItems()) {
                String username = item.get("username").getS();

                List<String> friends = new ArrayList<>();
                AttributeValue a = item.get("friends");
                if (a != null) friends = a.getSS();

                List<String> interests = new ArrayList<>();
                a = item.get("interests");
                if (a != null) interests = a.getSS();


                List<String> likedArticles = new ArrayList<>();
                a = item.get("likes");
                if (a != null) likedArticles = a.getSS();

                friends.forEach(friend -> {
                    try {
                        friendWriter.write(username + " " + friend);
                        friendWriter.newLine();
                    } catch (IOException e) {
                        e.printStackTrace();
                    }
                });

                interests.forEach(category -> {
                    try {
                        interestsWriter.write(username + " " + category);
                        interestsWriter.newLine();
                    } catch (IOException e) {
                        e.printStackTrace();
                    }
                });

                likedArticles.forEach(article -> {
                    try {
                        userLikesArticleWriter.write(username + " " + article);
                        userLikesArticleWriter.newLine();
                    } catch (IOException e) {
                        e.printStackTrace();
                    }
                });
            }

            friendWriter.close();
            interestsWriter.close();
            userLikesArticleWriter.close();

            BufferedWriter articleCategory = new BufferedWriter(new FileWriter("article_categories"));

            Map<String, AttributeValue> prev = null;

            do {
                scanRequest = new ScanRequest()
                    .withTableName("news_articles");
                if (prev != null) {
                    scanRequest.setExclusiveStartKey(prev);
                }
                result = client.scan(scanRequest);

                for (Map<String, AttributeValue> item : result.getItems()) {
                    String articleID = item.get("id").getN();
                    String articledate = item.get("date").getS();
                    String[] helper = articledate.split("-");
                    int aYear = Integer.parseInt(helper[0]);
                    int aMonth = Integer.parseInt(helper[1]);
                    int aDay = Integer.parseInt(helper[2]);
                    boolean valid = false;
                    if (aYear < date.getYear()) valid = true;
                    else if (aYear == date.getYear() && aMonth < date.getMonthValue()) valid  = true;
                    else if (aYear == date.getYear() && aMonth == date.getMonthValue()) valid = aDay <= date.getDayOfMonth();
                    if (!valid) continue;
                    if (date.getDayOfMonth() == aDay && date.getYear() == aYear && date.getMonthValue() == aMonth) {
                        today.add(articleID);
                    }
                    //System.out.println(today);
                    String category = item.get("category").getS();
                    articleCategory.write(articleID + " " + category);
                    articleCategory.newLine();
                }
                prev = result.getLastEvaluatedKey();
            } while (prev != null);

            articleCategory.close();

            File file = new File("friends");
            ObjectMetadata metadata = new ObjectMetadata();
            metadata.setContentType("text/plain");
            metadata.setContentLength(file.length());
            PutObjectRequest request = new PutObjectRequest("adsorptionfiles", "friends", file);
            s3Client.putObject(request);

            file = new File("interests");
            metadata = new ObjectMetadata();
            metadata.setContentType("text/plain");
            metadata.setContentLength(file.length());
            request = new PutObjectRequest("adsorptionfiles", "interests", file);
            s3Client.putObject(request);

            file = new File("article_categories");
            metadata = new ObjectMetadata();
            metadata.setContentType("text/plain");
            metadata.setContentLength(file.length());
            request = new PutObjectRequest("adsorptionfiles", "article_categories", file);
            s3Client.putObject(request);

            file = new File("userlikesarticle");
            metadata = new ObjectMetadata();
            metadata.setContentType("text/plain");
            metadata.setContentLength(file.length());
            request = new PutObjectRequest("adsorptionfiles", "userlikesarticle", file);
            s3Client.putObject(request);

            System.out.println("Uploaded all files");

            //System.exit(0);

            //Configuration conf = new Configuration();
            //FileSystem fs = FileSystem.get(conf);

            //Path articleCategoriesLocalPath = new Path("article_categories");
            //Path interestsLocalPath = new Path("interests");
            //Path friendsLocalPath = new Path("friends");
            //Path userlikesarticleLocalPath = new Path("userlikesarticle");

            //Path dstArticleCategories = new Path("file:///ip-172-31-86-119.ec2.internal:8020/user/livy/article_categories");
            //Path dstInterests = new Path("file:///ip-172-31-86-119.ec2.internal:8020/user/livy/interests");
            //Path dstFriends = new Path("file:////ip-172-31-86-119.ec2.internal:8020/user/livy/friends");
            //Path dstUserlikesarticles = new Path("hdfs://ip-172-31-86-119.ec2.internal:8020/user/livy/userlikesarticle");

            //fs.copyFromLocalFile(articleCategoriesLocalPath, dstArticleCategories);
            //fs.copyFromLocalFile(interestsLocalPath, dstInterests);
            //fs.copyFromLocalFile(friendsLocalPath, dstFriends);
            //fs.copyFromLocalFile(userlikesarticleLocalPath, dstUserlikesarticles);

            //fs.close();
            
        } catch (IOException e) {
            e.printStackTrace();
        }
    }

    public static void main(String[] args)
            throws IOException, URISyntaxException, InterruptedException, ExecutionException {

        // it makes sense for this to read in the dynamodb tables and make the files I
        // need right here, once per hour

        ScheduledExecutorService service = Executors.newScheduledThreadPool(1);


        //makeFiles();

        // System.exit(0);

        LivyClient client = new LivyClientBuilder()
                .setURI(new URI("http://ec2-35-173-232-155.compute-1.amazonaws.com:8998"))
                .build();


        System.out.println("Connected to livy");
        String jar = "target/nets2120-hw3-0.0.1-SNAPSHOT.jar";

        System.out.printf("Uploading %s to the Spark context...\n", jar);
        client.uploadJar(new File(jar)).get();

        System.out.println("Uploaded jar file");

        Runnable job = () -> {

            makeFiles();

            // System.exit(1);

            try {

                String sourceFile = Config.BIGGER_SOCIAL_NET_PATH;// .BIGGER_SOCIAL_NET_PATH;

                // System.out.printf("Running SocialRankJob with %s as its input...\n",
                // sourceFile);
                System.out.println("Running livy job");
                // run the job
                List<MyPair<String, HashMap<Integer, Double>>> result = client
                        .submit(new SocialRankJob(true, sourceFile)).get();
                //System.out.println(result);
                // List<MyPair<String, HashMap<Integer, Double>>> result = new ArrayList<>();
                // HashMap<Integer, Double> weights = new HashMap<>();
                // weights.put(20299, 0.8);
                // weights.put(126291, 0.2);
                // result.add(new MyPair<>("thakers", weights));
                // System.out.println(result);
                // upload weights straight to dynamodb
                for (MyPair<String, HashMap<Integer, Double>> user : result) {
                    Item userRow = userTable.getItem("username", user.getLeft());
                    System.out.println(user.getLeft());
                    List<Object> newsfeed = userRow.getList("newsfeed");
                    //System.out.println(newsfeed);
                    if (newsfeed == null)
                        newsfeed = new ArrayList<>();
                    HashMap<Integer, Double> snd = user.getRight();
                    double total = 0;
                    int newArticle = -1;
                    System.out.println(1);
                    for (Map.Entry<Integer, Double> entry : snd.entrySet()) {
                        String idString = Integer.toString(entry.getKey());
                        if (newsfeed.contains(idString))
                            continue;
                        if (!today.contains(idString))
                            continue;
                        total += entry.getValue();
                        double probability = entry.getValue() / total;
                        if (Math.random() < probability) {
                            newArticle = entry.getKey();
                        }
                    }
                    System.out.println(2);
                    if (newArticle != -1) {
                        System.out.println("found an article to add");
                        newsfeed.add(0, Integer.toString(newArticle));
                        UpdateItemSpec uis = new UpdateItemSpec()
                                .withPrimaryKey("username", user.getLeft())
                                .withUpdateExpression("set newsfeed = :n")
                                .withValueMap(new ValueMap().withList(":n", newsfeed));
                        userTable.updateItem(uis);
                    }
                    // Map<String, Double> map = new HashMap<>();
                    System.out.println(3);
                    for (int i : user.getRight().keySet()) {
                        if (user.getRight().get(i) > 5e-4) {
                            System.out.println(user.getRight().get(i));
                            Item toAdd = new Item().withPrimaryKey("username", user.getLeft())
                                .withString("article", Integer.toString(i))
                                .withDouble("weight", user.getRight().get(i));
                            outputTable.putItem(toAdd);
                        }
                            //map.put(Integer.toString(i), user.getRight().get(i));
                    }
                    System.out.println(4);
                    // Item toAdd = new Item()
                    // .withPrimaryKey("username", user.getLeft())
                    // .withMap("weights", map);
                    // outputTable.putItem(toAdd);
                    // pick a new article for the user to get

                }
                System.out.println("Added updated weights to database");
            } catch (Exception e) {
                System.out.println(e);
                System.exit(1);
            } finally {
                client.stop(true);
            }
        };

        service.scheduleAtFixedRate(job, 0, 60, TimeUnit.MINUTES);

    }

}
